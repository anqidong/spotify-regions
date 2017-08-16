"use strict";!function(){function t(){var t=window.location.href.split("#")[0],e="https://accounts.spotify.com/authorize?response_type=token&client_id="+encodeURIComponent("e1e537d4eb8c485c9f34843a0e2cb2b6")+"&redirect_uri="+encodeURIComponent(t);window.location.replace(e)}function e(t){for(var e,a=/([^&=]+)=([^&;]+)/g,i={};null!==(e=a.exec(t));)i[e[1]]=decodeURIComponent(e[2]);return i}function a(t){var e=t.replace(/ /g,"+");if("artistsSearch"!==l||e!==m){l="artistsSearch",m=e;var a="https://api.spotify.com/v1/search?q="+e+"&type=artist&limit=50";$.ajax({url:a,headers:{Authorization:"Bearer "+o},success:function(t){i(t.artists.items,!1)}}),document.title='Search: "'+t+'" - '+u}}function i(t,e){$("#album-results").hide(),e||($("#artist-results").empty(),0===t.length&&$("#artist-results").html('<span class="no-res">(no results)</span>')),$("#artist-results").show();var a=$("<ul></ul>").appendTo($("#artist-results")),i=t.map(function(t){var e=[],a='<a href="#" class="artist-open-button touch-action" data-artist-id="'+t.id+'" data-artist-name="'+t.name+'">open</a>';return e.push(t.name),e.push("("+t.popularity+")"),"genres"in t&&t.genres.length>0&&e.push("{genres: "+t.genres.join(", ")+"}"),"<li>"+a+" "+e.join(" ")+"</li>"}).join("");a.html(i),$("a.artist-open-button").click(function(){return document.title=$(this).data("artist-name")+" - "+u,n($(this).data("artist-id")),!1})}function n(t){l="artistView",m=t,$("#artist-results").hide(),$("#album-results").empty(),$("#album-results").show(),r("https://api.spotify.com/v1/artists/"+t+"/albums?limit=25",4)}function r(t,e){e<=0?$("#album-results").append("<div><i>(remainder truncated)</i></div>"):$.ajax({url:t,headers:{Authorization:"Bearer "+o},success:function(t){var a=$("<ul></ul>").appendTo($("#album-results")),i=t.items.map(function(t){var e="<img src='"+t.images.slice(-1).pop().url+"' class='album-cover-art' width='32' height ='32' />",a=t.available_markets.map(function(t){var e=t.toUpperCase(),a=e in c?c[e]:e;return"<i class='famfamfam-flag-"+t.toLowerCase()+"' aria-label='"+a+"' title='"+a+"'></i>"}).join(" ");return"<li><div class='album-open-button touch-action' data-album-id='"+t.id+"'>"+e+t.name+"</div><div class='album-markets'>"+a+"</div></li>"}).join("");a.html(i),a.find("div.album-open-button").click(function(){return s("https://api.spotify.com/v1/albums/"+$(this).data("album-id")+"/tracks?limit=50"),!1}),null!==t.next&&r(t.next,e-1)}})}function s(t,e){void 0===e&&(e=""),$.ajax({url:t,headers:{Authorization:"Bearer "+o},success:function(t){var a=t.items.map(function(t){return t.track_number+". "+t.name+(t.explicit?" (E)":"")+"\n"}).join("");e+=a,null!==t.next?s(t.next,e):window.alert(e)}})}var o=function(){if(window.location.hash.length>0){var a=e(window.location.hash.substring(1));if(history.replaceState(null,"","#"),"access_token"in a)return $(document).ready(function(t){$("#failure-fallback").hide()}),[a.access_token,parseInt(a.expires_in,10)];if("error"in a)return $(document).ready(function(t){$("#main-content").html(""),$("#main-content").hide(),$("#failure-fallback").html("Auth failed with error "+a.error)}),[null,NaN]}return t(),[null,NaN]}()[0],u="Spotify region search",c={},l="blank",m="";$(function(){$.getJSON("country-codes.json",function(t){c=t})}),$(document).ready(function(t){var e=function(){var t=$("#artist-search-field").val().trim();return t&&a(t),!1};$("#artist-search-field").keyup(function(t){13===t.keyCode&&e()}),$("#artist-search-go").click(e),$("#artist-search-form").submit(e),$("#artist-search-form").focusout(e)})}();