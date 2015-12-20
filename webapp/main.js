"use strict";

(function(){
    var appName = "Spotify region search";

    $(document).ready(function(event) {
        $.getJSON("country-codes.json", function(data) {
            window.countryCodes = data;
        });
        
        $("#artist-search").keyup(function(e) {
            if (e.keyCode == 13) {
                // enter key pressed
                setArtistSearch($("#artist-search").val());
            }
        });
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
        var contents = [];
        
        for (var i = 0; i < artistList.length; i++) {
            var item = artistList[i];
            var displayElements = [];
            
            var linkHtml = 
                '<a href="#" class="artist-open-button" ' + 
                'data-artist-id="' + item.id + '" ' + 
                'data-artist-name="' + item.name + '">open</a>';
            
            displayElements.push(item.name);
            displayElements.push("(" + item.popularity + ")");
            if (("genres" in item) && (item.genres.length > 0)) {
                displayElements.push("{genres: " + item.genres.join(", ") + "}");
            }
            
            contents.push("<li>" + displayElements.join(" ") + " " + linkHtml);
        }
        
        domList.html(contents.join(""));
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
        
        appendSongs("https://api.spotify.com/v1/artists/" + artistId + "/albums", 3);
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
            var contents = [];
            
            for (var i = 0; i < data.items.length; i++) {
                var item = data.items[i];
                
                var imageStr = item.images.slice(-1).pop().url;
                var marketStr = item.available_markets
                    .map(function(str) {
                        return "<img " + 
                            "src='flags/" + str + ".png' " + 
                            "alt='" + countryCodes[str] + "' " + 
                            "title='" + countryCodes[str] + "' />";
                    }).join(" ");
                    
                contents.push(
                    "<li><img src='" + imageStr + "' width='32' height ='32' />" + 
                    data.items[i].name + ": " + marketStr + "</li>");
            }
            
            domList.html(contents.join(""));
            
            // TODO do lazy infinite scroll
            if (data.next !== null) {
                appendSongs(data.next, countdown - 1);
            }
        });
    }
})();
