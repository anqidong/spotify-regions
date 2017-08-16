/// <reference path="../jquery.d.ts"/>

"use strict";

(function main() {
    function redirectForAuth() {
        // if you're planning to use this code, please use a different string
        const client_id: string = "e1e537d4eb8c485c9f34843a0e2cb2b6";

        const currUrl: string = window.location.href.split("#")[0]; // strips hash out
        const authUrl: string = "https://accounts.spotify.com/authorize" +
                "?response_type=token" +
                "&client_id=" + encodeURIComponent(client_id) +
                "&redirect_uri=" + encodeURIComponent(currUrl);

        window.location.replace(authUrl);
    }

    function parseHashAsGetString(query: string): object {
        const pat: RegExp = /([^&=]+)=([^&;]+)/g;
        let match: string[];
        let data: object = {};

        while ((match = pat.exec(query)) !== null) {
            data[match[1]] = decodeURIComponent(match[2]);
        }

        return data;
    }

    // returns a tuple of access_token, expiry_delta (can be NaN)
    function requireImplicitGrant(): [string | null, number] {
        if (window.location.hash.length > 0) {
            const hashData: any = parseHashAsGetString(window.location.hash.substring(1));

            // wipe hash from page URL
            history.replaceState(null, "", "#");

            if ("access_token" in hashData) {
                // TODO validate state key from local storage

                $(document).ready(function(_) {
                    $("#failure-fallback").hide();
                });

                // parseInt should return NaN if expires_in wasn't found in the hashData
                return [hashData.access_token, parseInt(hashData.expires_in, 10)];
            } else if ("error" in hashData) {
                // the DOM might not yet be parsed here, so wait until document is ready
                $(document).ready(function(_) {
                    $("#main-content").hide().html("");
                    $("#failure-fallback").html("Auth failed with error " + hashData.error);
                });

                return [null, NaN];
            }
        }

        // if the code reaches here, no access token was retrievable
        redirectForAuth();

        // this return should be unreachable
        return [null, NaN];
    }

    const authData: [string | null, number] = requireImplicitGrant();
    const accessToken: string | null = authData[0];

    const appName: string = "Spotify region search";
    let countryCodes = {}; // TODO see if a type signature can be applied here


    // TODO can we group this into a namespace of sorts?
    type AppViews = "blank" | "artistsSearch" | "artistView";
    let appState: AppViews = "blank";
    let activeSearch: string = "";

    $(function() {
        $.getJSON("country-codes.json", function(data) { countryCodes = data; });
    }); // TODO is this actually safe?

    $(document).ready(function(event) {
        let doSearch = function doSearch() {
            const artistString: string = $("#artist-search-field").val().trim();
            if (artistString) {
                setArtistSearch(artistString);
            }
            return false;
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
        const nameEncoded: string = artistName.replace(/ /g, "+");

        if (appState === "artistsSearch" && nameEncoded === activeSearch) {
            // this prevents the app from re-searching an artist needlessly
            return;
        }

        appState = "artistsSearch";
        activeSearch = nameEncoded;

        const queryUrl: string = "https://api.spotify.com/v1/search?q=" +
                nameEncoded + "&type=artist&limit=50";

        $.ajax({
            url: queryUrl,
            headers: { 'Authorization': 'Bearer ' + accessToken },
            success: function(data) {
                renderArtists(data.artists.items, false);
            },
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

        $("#artist-results").show();

        // dumping stuff into a list, then writing it into a separate list
        // element, so that we don't rewrite the DOM too heavily
        const domList = $("<ul></ul>").appendTo($("#artist-results"));
        const htmlSoup: string = artistList.map(function(artist) {
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
            document.title = $(this).data("artist-name") + " - " + appName;
            populateAlbums($(this).data("artist-id"));
            return false;
        });
    }

    function populateAlbums(artistId: string) {
        appState = "artistView";
        activeSearch = artistId;

        $("#artist-results").hide();
        $("#album-results").empty();

        // show before, because we can allow the user to see the pagination happening
        $("#album-results").show();

        appendAlbums(
            "https://api.spotify.com/v1/artists/" + artistId + "/albums?limit=25", 4);
    }

    function appendAlbums(queryUrl: string, countdown: number) {
        function renderAlbumsFromJson(data) {
            // dumping stuff into a list, then writing it into a separate list
            // element, so that we don't rewrite the DOM too heavily
            const domList = $("<ul></ul>").appendTo($("#album-results"));

            const listSoup: string = data.items.map(function(album) {
                const imageStr = album.images.slice(-1).pop().url;
                const imageHtml =
                        "<img src='" + imageStr +
                        "' class='album-cover-art' width='32' height ='32' />";

                const marketHtml = album.available_markets
                    .map(function(countryCodeIso) {
                        const cc: string = countryCodeIso.toUpperCase();
                        const countryName: string =
                                (cc in countryCodes) ? countryCodes[cc] : cc;

                        return "<i class='" + // "album-region-icon " +
                            "famfamfam-flag-" + countryCodeIso.toLowerCase() + "' " +
                            "aria-label='" + countryName + "' " +
                            "title='" + countryName + "'></i>";
                    }).join(" ");

                const linkHtml =
                    "<div class='album-open-button touch-action' " +
                    "data-album-id='" + album.id + "'>" + imageHtml +
                    album.name + "</div>";

                return "<li>" + linkHtml + "<div class='album-markets'>"
                        + marketHtml + "</div></li>";
            }).join("");

            domList.html(listSoup);
            domList.find("div.album-open-button").click(function albumOpenHandler() {
                const trackUrl: string =
                    "https://api.spotify.com/v1/albums/" +
                    $(this).data("album-id") + "/tracks?limit=50";
                getTracks(trackUrl);
                return false;
            });

            // TODO do lazy infinite scroll
            if (data.next !== null) {
                appendAlbums(data.next, countdown - 1);
            }
        }

        if (countdown <= 0) {
            $("#album-results").append("<div><i>(remainder truncated)</i></div>");
        } else {
            $.ajax({
                url: queryUrl,
                headers: { 'Authorization': 'Bearer ' + accessToken },
                success: renderAlbumsFromJson,
            });
        }
    }

    function getTracks(dataUrl: string, allTracks = "") {
        $.ajax({
            url: dataUrl,
            headers: { 'Authorization': 'Bearer ' + accessToken },
            success: function(data) {
                const currTracks: string = data.items.map(function(track) {
                    return track.track_number + ". " + track.name +
                        (track.explicit
                            ? " (E)"
                            : "") + "\n";
                }).join("");

                allTracks = allTracks + currTracks;

                if (data.next !== null) {
                    getTracks(data.next, allTracks);
                } else {
                    window.alert(allTracks);
                }
            },
        });
    }
})();
