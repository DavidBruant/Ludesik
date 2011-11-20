/**
 * Copyright (c) 2011 David Bruant & Damien Riccio
 * MIT Licence
 */

"use strict";

/**
 * Constructor
 * @container, DOM element where to put the audio elements
 * @sounds, sound URLs indexed by wall identifier
 */
function SoundPlayer(container, sounds) {
    var audios; // Object indexed on wall ids. It contains arrays of identical <audio> elements

    this.playAll = function(soundIds){
        soundIds.forEach(function(id){
            var sounds = audios[id];
            var toPlay = null;
            
            // If a sound is available, play it. Otherwise, clone play and store (for later)
            
            var someAvailable = sounds.some(function(s, i){
                var available = s.ended || s.paused ; // TODO find the best definition
                if(available)
                    toPlay = s;
                return available;
            });
            
            if(!someAvailable){
                toPlay = sounds[0].cloneNode(true);// http://robert.ocallahan.org/2011/11/latency-of-html5-sounds.html
                // Progress at https://bugzilla.mozilla.org/show_bug.cgi?id=703379
                toPlay.load();
                sounds.push(toPlay);
            }
            
            try{ // Sometimes .play() throws an NS_ERROR_OUT_OF_MEMORY on Firefox
                toPlay.play();
            }
            catch(e){
                console.log(e);
            }
        });
    };

    (function() {
        var ids = Object.keys(sounds);
        var audioByUrl = {};
        
        audios = {};

        ids.forEach(function(id){
            var url = sounds[id];
            var a;
            
            if(url in audioByUrl){
                a = audioByUrl[url];
            }
            else{
                a = new Audio(url);
                a.load();
                audioByUrl[url] = a;
                // No need to append it to the DOM tree
            }

            audios[id] = [a];
        });

    }).call(this);
}
