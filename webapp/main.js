"use strict";

$(document).ready(function(event) {
    $.getJSON("country-codes.json", function(data) {
        window.countryCodes = data;
    });
    
    $("#artist-search").keyup(function(e) {
        if (e.keyCode == 13) {
            // enter key pressed
            
            var artistId = $("#artist-search").val()
            setName(artistId);
            populateSongs(artistId);
        }
    });
});

function setName(artistId) {
    $.getJSON("https://api.spotify.com/v1/artists/" + artistId, function(data) {
        var name = data.name;
        
        $("span#artist-name").html(name);
        document.title = name + " - Spotify region search";
    });
}

function populateSongs(artistId) {
    $("#songs").empty();
    appendSongs("https://api.spotify.com/v1/artists/" + artistId + "/albums");
}

function appendSongs(url) {
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
            appendSongs(data.next);
        }
    });
}
