/// <reference path="../jquery.d.ts"/>

"use strict";

(function main() {

    interface StrDictionary<T> {
        [K: string]: T;
    }

    // localStorage/sessionStorage keys are short to be slightly obfuscated and to reduce code size
    const ACCESS_TOKEN_KEY = "spot_a";
    const EXPIRATION_KEY = "spot_b";
    const NONCE_KEY = "spot_c";
    const TOKEN_EXPIRY_PAD_MS = 15 * 1000;
    const NONCE_LENGTH = 36;

    function _redirectForAuth(nonce: string): never {
        // if you're planning to use this code, please use a different string
        const CLIENT_ID: string = "e1e537d4eb8c485c9f34843a0e2cb2b6";

        // strips hash out; hash always starts at first # symbol
        const currUrl: string = window.location.href.split("#")[0];
        const authUrl: string = "https://accounts.spotify.com/authorize" +
                "?response_type=token" +
                "&client_id=" + CLIENT_ID +
                "&redirect_uri=" + encodeURIComponent(currUrl) +
                "&state=" + nonce;

        window.location.replace(authUrl);

        throw "assert failed, redirect error";
    }

    function parseHashAsGetString(query: string): StrDictionary<string> {
        const pat: RegExp = /([^&=#;]+)=([^&#;]+)/g;
        let match: Array<string> | null;
        let data: StrDictionary<string> = {};

        while ((match = pat.exec(query)) !== null) {
            data[match[1]] = decodeURIComponent(match[2]);
        }

        return data;
    }

    function _setStoredImplicitGrant(accessToken: string, validDurationSecs: number): void {
        const validDurationMs = validDurationSecs * 1000;
        if (validDurationMs > TOKEN_EXPIRY_PAD_MS) {
            const expiryTimestamp = Date.now() + validDurationMs;
            window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
            window.localStorage.setItem(EXPIRATION_KEY, expiryTimestamp.toString());
        } else {
            window.localStorage.removeItem(ACCESS_TOKEN_KEY);
            window.localStorage.removeItem(EXPIRATION_KEY);
        }
    }

    function _getStoredImplicitGrant(): string | undefined {
        const expiryTimeStr: string = window.localStorage.getItem(EXPIRATION_KEY) || "0";
        const expiryTimestamp: number = parseInt(expiryTimeStr, 10);

        if (!isNaN(expiryTimestamp) &&
                expiryTimestamp > (Date.now() + TOKEN_EXPIRY_PAD_MS)) {
            return window.localStorage.getItem(ACCESS_TOKEN_KEY);
        }

        return undefined;
    }

    // adapted from https://stackoverflow.com/questions/1349404
    function _generateNonce(length: number): string {
        const SAMPLE_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let text = "";

        // TODO string concatenation is not efficient
        for (let i = 0; i < length; i++) {
            // this is not completely uniformly distributed, but that's acceptable here
            text += SAMPLE_SET.charAt(Math.floor(Math.random() * SAMPLE_SET.length));
        }

        return text;
    }

    // returns a tuple of access_token, expiry_delta (can be NaN)
    function requireImplicitGrant(): string | undefined {
        const storedGrant = _getStoredImplicitGrant();
        if (storedGrant != undefined) {
            return storedGrant;
        }

        if (window.location.hash.length > 0) {
            let fail = function(message: string): void {
                // the DOM might not yet be set up, so wait until document is ready before making
                // modifications to it
                $(document).ready(function() {
                    $("#main-content").hide().empty();
                    $("#failure-fallback").html(message);
                });
            }

            const hashData: StrDictionary<string> =
                    parseHashAsGetString(window.location.hash.substring(1));

            // wipe hash from page URL
            history.replaceState(null, "", "#");

            if ("access_token" in hashData) {
                const storedNonce: string | null = window.sessionStorage.getItem(NONCE_KEY);
                window.sessionStorage.removeItem(NONCE_KEY); // clear to prevent accidental reuse

                if (storedNonce === null) {
                    fail("Request not issued with CSRF token");
                    return undefined;
                }

                if (!("state" in hashData) || (storedNonce !== hashData["state"])) {
                    fail("CSRF token validation failed");
                    return undefined;
                }

                $(document).ready(function() {
                    $("#failure-fallback").hide();
                });

                // parseInt should return NaN if expires_in wasn't found in the hashData
                _setStoredImplicitGrant(
                        hashData["access_token"], parseInt(hashData["expires_in"], 10));
                return hashData["access_token"];
            } else if ("error" in hashData) {
                fail("API auth failed with error " + hashData["error"]);
                return undefined;
            }
        }

        // if the code reaches here, no access token was retrievable
        const nonce = _generateNonce(NONCE_LENGTH);
        window.sessionStorage.setItem(NONCE_KEY, nonce);
        return _redirectForAuth(nonce);
    }

    const accessToken: string | null = requireImplicitGrant();

    let countryCodes: any = {}; // can't apply a type signature, because data is dynamically loaded

    // TODO can we group this into a namespace of sorts

    const MAX_ALBUM_PAGES = 4;
    const APP_NAME: string = "Spotify region search";

    const enum AppViews {
        Blank,
        ArtistsSearch,
        ArtistView,
    }

    let appState: AppViews = AppViews.Blank;
    let activeSearch: string = "";

    $(function() {
        $.getJSON("country-codes.json", function(data) { countryCodes = data; });
    }); // TODO inline country codes

    $(document).ready(function() {
        function doSearch() {
            const artistString: string = $("#artist-search-field").val().trim();
            if (artistString) {
                setArtistSearch(artistString);
            }
            return false;
        };

        $("#artist-search-field").keyup(function(e) {
            const ENTER_KEY_CODE = 13;
            if (e.keyCode === ENTER_KEY_CODE) {
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
        const nameEncoded: string = encodeURIComponent(artistName.replace(/ /g, "+"));

        if (appState === AppViews.ArtistsSearch && nameEncoded === activeSearch) {
            // this prevents the app from re-searching an artist needlessly
            return;
        }

        appState = AppViews.ArtistsSearch;
        activeSearch = nameEncoded;

        const queryUrl: string = "https://api.spotify.com/v1/search?q=" +
                nameEncoded + "&type=artist&limit=50";

        $.ajax({
            url: queryUrl,
            headers: { 'Authorization': 'Bearer ' + accessToken },
            success: function(data) {
                _renderArtists(data.artists.items, false);
            },
        });

        document.title = 'Search: "' + artistName + '" - ' + APP_NAME;
    }

    function _renderArtists(artistList: Array<any>, isAppend: boolean) {
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

        $("a.artist-open-button").click(
            function artistOpenHandler(this: JQueryEventObject) {
                document.title = $(this).data("artist-name") + " - " + APP_NAME;
                populateAlbums($(this).data("artist-id"));
                return false;
            });
    }

    function populateAlbums(artistId: string) {
        appState = AppViews.ArtistView;
        activeSearch = artistId;

        $("#artist-results").hide();

        // show before append, to allow the user to see the pagination happening
        $("#album-results").empty().show();
        _appendAlbums("https://api.spotify.com/v1/artists/" +
                     encodeURIComponent(artistId) + "/albums?limit=25",
                     MAX_ALBUM_PAGES);
    }

    function _appendAlbums(queryUrl: string, countdown: number) {
        function renderAlbumsFromJson(data: any) {
            // dumping stuff into a list, then writing it into a separate list
            // element, so that we don't rewrite the DOM too heavily
            const domList = $("<ul></ul>").appendTo($("#album-results"));

            const listSoup: string = data.items.map(function(album: any) {
                const imageStr = album.images.slice(-1).pop().url;
                const imageHtml =
                        "<img src='" + imageStr +
                        "' class='album-cover-art' width='32' height ='32' />";

                const marketHtml = album.available_markets
                    .map(function(countryCodeIso: string) {
                        const cc: string = countryCodeIso.toUpperCase();
                        const countryName: string =
                                (cc in countryCodes) ? countryCodes[cc] : cc;

                        return "<span class='" + // "album-region-icon " +
                            "famfamfam-flag-" + countryCodeIso.toLowerCase() + "' " +
                            "aria-label='" + countryName + "' " +
                            "title='" + countryName + "'></span>";
                    }).join(" ");

                const linkHtml =
                    "<div class='album-open-button touch-action' " +
                    "data-album-id='" + album.id + "'>" + imageHtml +
                    album.name + "</div>";

                return "<li>" + linkHtml + "<div class='album-markets'>"
                        + marketHtml + "</div></li>";
            }).join("");

            domList.html(listSoup);
            domList.find("div.album-open-button").click(
                function albumOpenHandler(this: JQueryEventObject) {
                    const trackUrl: string =
                        "https://api.spotify.com/v1/albums/" +
                        $(this).data("album-id") + "/tracks?limit=50";
                    getTracks(trackUrl);
                    return false;
                });

            // TODO do lazy infinite scroll
            if (data.next !== null) {
                _appendAlbums(data.next, countdown - 1);
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
            success: function(data: any) {
                const currTracks: string = data.items.map(function(track: any) {
                    return track.track_number + ". " + track.name +
                        (track.explicit ? " (E)" : "") + "\n";
                }).join("");

                allTracks += currTracks;

                if (data.next !== null) {
                    getTracks(data.next, allTracks);
                } else {
                    window.alert(allTracks);
                }
            },
        });
    }

})();
