"use strict";

(function() {
    var appName = "Spotify region search";
    var countryCodes = {};
    
    $(function() {
        $.getJSON("country-codes.json", function(data) { countryCodes = data; });
    });

    $(document).ready(function(event) {
        var doSearch = function() {
            var artistString = $("#artist-search-field").val().trim();
            if (artistString) {
                setArtistSearch(artistString);
            }
        };
        
        $("#artist-search-field").keyup(function(e) {
            if (e.keyCode == 13) {
                // enter key pressed
                doSearch();
            }
        });
        
        $("#artist-search-go").click(doSearch);
        $("#artist-search-form").submit(doSearch);
    });

    function setArtistSearch(artistName) {
        var nameEncoded = artistName.replace(/ /g, "+");
        var queryUrl = 
            "https://api.spotify.com/v1/search?q=" + 
                nameEncoded + "&type=artist&limit=50";
        // don't set the market, in order to receive artist results for any market
        
        $.getJSON(queryUrl, function(data) {
            renderArtists(data.artists.items, false);
        });
        
        document.title = 'Search: "' + artistName + '" - ' + appName;
    }

    function renderArtists(artistList, isAppend) {
        $("#songs").hide();
        
        if (!isAppend) {
            $("#artist-results").empty();
        }
        $("#artist-results").show();
        
        // dumping stuff into a list, then writing it into a separate list 
        // element, so that we don't rewrite the DOM too heavily
        var domList = $("<ul></ul>").appendTo($("#artist-results"));
        var htmlSoup = artistList.map(function(artist) {
            var displayElements = [];
            
            var linkHtml = 
                '<a href="#" class="artist-open-button" ' + 
                'data-artist-id="' + artist.id + '" ' + 
                'data-artist-name="' + artist.name + '">open</a>';
            
            displayElements.push(artist.name);
            displayElements.push("(" + artist.popularity + ")");
            if (("genres" in artist) && (artist.genres.length > 0)) {
                displayElements.push("{genres: " + artist.genres.join(", ") + "}");
            }
            
            return  "<li>" + linkHtml + " " + displayElements.join(" ") + "</li>";
        }).join("");
        domList.html(htmlSoup);
        
        $(".artist-open-button").click(function() {
           document.title = $(this).data('artist-name') + ' - ' + appName;
           populateSongs($(this).data('artist-id'));
           return false;
        });
    }

    function populateSongs(artistId) {
        $("#artist-results").hide();
        $("#songs").empty();
        $("#songs").show();
        
        appendSongs(
            "https://api.spotify.com/v1/artists/" + artistId + "/albums", 3);
    }

    function appendSongs(url, countdown) {
        if (countdown <= 0) {
            $("#songs").append("<div><i>(remainder truncated)</i></div>");
            return;
        }
        
        $.getJSON(url, function(data) {
            // dumping stuff into a list, then writing it into a separate list 
            // element, so that we don't rewrite the DOM too heavily
            var domList = $("<ul></ul>").appendTo($("#songs"));
            
            var listSoup = data.items.map(function(album) {
                var imageStr = album.images.slice(-1).pop().url;
                var marketStr = album.available_markets
                    .map(function(str) {
                        return "<img " + 
                            "src='flags/" + str + ".png' " + 
                            "alt='" + countryCodes[str] + "' " + 
                            "title='" + countryCodes[str] + "' />";
                    }).join(" ");
                    
                return "<li><img src='" + imageStr + "' width='32' height ='32' />" + 
                       album.name + "<br />" + marketStr + "</li>";
            }).join("");
            
            domList.html(listSoup);
            
            // TODO do lazy infinite scroll
            if (data.next !== null) {
                appendSongs(data.next, countdown - 1);
            }
        });
    }
})();
