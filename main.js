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

        // $("#artist-search-field").blur(doSearch);
                
        $("#artist-search-go").click(doSearch);
        
        $("#artist-search-form").submit(doSearch);
        $("#artist-search-form").focusout(doSearch);
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
        $("#album-results").hide();

        if (!isAppend) {
            $("#artist-results").empty();

            if (artistList.length === 0) {
                $("#artist-results").html(
                        '<span class="no-res">(no results)</span>');
            }
        }
        $("#artist-results").show();

        // dumping stuff into a list, then writing it into a separate list
        // element, so that we don't rewrite the DOM too heavily
        var domList = $("<ul></ul>").appendTo($("#artist-results"));
        var htmlSoup = artistList.map(function(artist) {
            var displayElements = [];

            var linkHtml =
                '<a href="#" class="artist-open-button touch-action" ' +
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

        $("a.artist-open-button").click(function() {
           document.title = $(this).data('artist-name') + ' - ' + appName;
           populateAlbums($(this).data('artist-id'));
           return false;
        });
    }

    function populateAlbums(artistId) {
        $("#artist-results").hide();
        $("#album-results").empty();
        $("#album-results").show();

        appendAlbums(
            "https://api.spotify.com/v1/artists/" + artistId + "/albums?limit=25", 4);
    }

    function appendAlbums(url, countdown) {
        if (countdown <= 0) {
            $("#album-results").append("<div><i>(remainder truncated)</i></div>");
            return;
        }

        $.getJSON(url, function(data) {
            // dumping stuff into a list, then writing it into a separate list
            // element, so that we don't rewrite the DOM too heavily
            var domList = $("<ul></ul>").appendTo($("#album-results"));

            var listSoup = data.items.map(function(album) {
                var imageStr = album.images.slice(-1).pop().url;
                var imageHtml = 
                        "<img src='" + imageStr + 
                        "' class='album-cover-art' width='32' height ='32' />";
                
                var marketHtml = album.available_markets
                    .map(function(strOrig) {
                        var str = strOrig.toUpperCase();
                        
                        return "<img class='album-region-icon'" +
                            "src='flags/" + str.toLowerCase() + ".png' " +
                            "alt='" + countryCodes[str] + "' " +
                            "title='" + countryCodes[str] + "' />";
                    }).join(" ");
                    
                var linkHtml =
                    '<div class="album-open-button touch-action" ' +
                    'data-album-id="' + album.id + '">' + imageHtml +
                    album.name + '</div>';

                return "<li>" + linkHtml + "<div class='album-markets'>" 
                        + marketHtml + "</div></li>";
            }).join("");

            domList.html(listSoup);
            domList.find("div.album-open-button").click(function() {
                var trackUrl =
                    "https://api.spotify.com/v1/albums/" +
                    $(this).data('album-id') + "/tracks?limit=50";
                getTracks(trackUrl);
                return false;
            });

            // TODO do lazy infinite scroll
            if (data.next !== null) {
                appendAlbums(data.next, countdown - 1);
            }
        });
    }

    function getTracks(dataUrl, allTracks) {
        allTracks = allTracks || "";

        $.getJSON(dataUrl, function(data) {
            var currTracks = data.items.map(function(track) {
                return track.track_number + ". " + track.name +
                    (track.explicit ? " (E)" : "") + "\n";
            }).join("");

            allTracks = allTracks + currTracks;

            if (data.next !== null) {
                getTracks(data.next, allTracks);
            } else {
                window.alert(allTracks);
            }
        });
    }
})();
