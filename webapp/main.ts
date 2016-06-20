/// <reference path="../jquery.d.ts"/>

"use strict";

(function main() {
    let appName: string = "Spotify region search";
    let countryCodes = {}; // TODO see if a type signature can be applied here

    $(function() {
        $.getJSON("country-codes.json", function(data) { countryCodes = data; });
    }); // TODO is this actually safe?

    $(document).ready(function(event) {
        let doSearch = function doSearch() {
            var artistString: string = $("#artist-search-field").val().trim();
            if (artistString) {
                setArtistSearch(artistString);
            }
        };

        $("#artist-search-field").keyup(function(e) {
            if (e.keyCode === 13) {
                // enter key pressed
                doSearch();
            }
        });

        // $("#artist-search-field").blur(doSearch);
                
        $("#artist-search-go").click(doSearch);
        
        $("#artist-search-form").submit(doSearch);
        $("#artist-search-form").focusout(doSearch);
    });

    function setArtistSearch(artistName: string) {
        let nameEncoded = artistName.replace(/ /g, "+");
        let queryUrl =
            "https://api.spotify.com/v1/search?q=" +
                nameEncoded + "&type=artist&limit=50";
        // don't set the market, in order to receive artist results for any market

        $.getJSON(queryUrl, function(data) {
            renderArtists(data.artists.items, false);
        });

        document.title = 'Search: "' + artistName + '" - ' + appName;
    }

    function renderArtists(artistList: Array<any>, isAppend: boolean) {
        $("#album-results").hide();

        if (!isAppend) {
            $("#artist-results").empty();

            if (artistList.length === 0) {
                $("#artist-results").html(
                        '<span class="no-res">(no results)</span>');
            }
        }
        
        // dumping stuff into a list, then writing it into a separate list
        // element, so that we don't rewrite the DOM too heavily
        let domList = $("<ul></ul>").appendTo($("#artist-results"));
        let htmlSoup: string = artistList.map(function(artist) {
            let displayElements: Array<string> = [];

            let linkHtml: string =
                '<a href="#" class="artist-open-button touch-action" ' +
                'data-artist-id="' + artist.id + '" ' +
                'data-artist-name="' + artist.name + '">open</a>';

            displayElements.push(artist.name);
            displayElements.push("(" + artist.popularity + ")");
            if (("genres" in artist) && (artist.genres.length > 0)) {
                displayElements.push("{genres: " + artist.genres.join(", ") + "}");
            }

            return "<li>" + linkHtml + " " + displayElements.join(" ") + "</li>";
        }).join("");
        domList.html(htmlSoup);

        $("a.artist-open-button").click(function artistOpenHandler() {
            // FIXME for some reason this takes two clicks to register
            console.log('aoh');
            document.title = $(this).data('artist-name') + ' - ' + appName;
            populateAlbums($(this).data('artist-id'));
            // return false;
        });
        
        // make sure to show this AFTER event listeners are attached!
        $("#artist-results").show();
    }

    function populateAlbums(artistId: string) {
        $("#artist-results").hide();
        $("#album-results").empty();
        
        // show before, because we can allow the user to see the pagination happening
        $("#album-results").show();

        appendAlbums(
            "https://api.spotify.com/v1/artists/" + artistId + "/albums?limit=25", 4);
    }

    function appendAlbums(url: string, countdown: number) {
        if (countdown <= 0) {
            $("#album-results").append("<div><i>(remainder truncated)</i></div>");
            return;
        }

        $.getJSON(url, function(data) {
            // dumping stuff into a list, then writing it into a separate list
            // element, so that we don't rewrite the DOM too heavily
            let domList = $("<ul></ul>").appendTo($("#album-results"));

            let listSoup: string = data.items.map(function(album) {
                var imageStr = album.images.slice(-1).pop().url;
                var imageHtml = 
                        "<img src='" + imageStr + 
                        "' class='album-cover-art' width='32' height ='32' />";
                
                var marketHtml = album.available_markets
                    .map(function(countryCodeIso) {
                        let cc: string = countryCodeIso.toUpperCase();
                        let countryName: string = (cc in countryCodes)
                            ? countryCodes[cc]
                            : cc;
                        
                        
                        return "<i class='" + // "album-region-icon " +
                            "famfamfam-flag-" + countryCodeIso.toLowerCase() + "' " +
                            "aria-label='" + countryName + "' " +
                            "title='" + countryName + "'></i>";
                    }).join(" ");
                    
                var linkHtml =
                    '<div class="album-open-button touch-action" ' +
                    'data-album-id="' + album.id + '">' + imageHtml +
                    album.name + '</div>';

                return "<li>" + linkHtml + "<div class='album-markets'>" 
                        + marketHtml + "</div></li>";
            }).join("");

            domList.html(listSoup);
            domList.find("div.album-open-button").click(function albumOpenHandler() {
                let trackUrl: string =
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

    function getTracks(dataUrl: string, allTracks = "") {
        $.getJSON(dataUrl, function(data) {
            let currTracks: string = data.items.map(function(track) {
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
