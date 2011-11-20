/**
 * Copyright (c) 2011 David Bruant & Damien Riccio
 * MIT Licence
 */

"use strict";

function Ludesik(renderer, container, menu){
    var map = new Map();
    var counter = 0;
    var soundPlayer;
    var intervalRef;
    var isPlaying;

    var tempo;

    var playPauseButton;
    
    var slowTempoBtns;
    var speedTempoBtns;
    var saveBtns;
    var clearBtns;
    var savedStateContainers;

    var savedStateCount = 0;

    /**
     * forEach is defined for NodeList and HtmlCollection manipulation convinience
     * (except Firefox which returns an HtmlCollection. See bug https://bugzilla.mozilla.org/show_bug.cgi?id=14869).
     * A NodeList is not an array so forEach is not defined in the returned collection.
     */
    var forEach = Function.prototype.call.bind(Array.prototype.forEach);

    /**
     *
     * @param position : type {x, y}
     * @param direction : type {deltaX, deltaY}
     */
    function addMobileAgentWithDirection(position, direction) {
        map.addMobileAgent(counter, position, direction);
        renderer.addMobileAgent(counter, position, direction);

        counter++;
    }

    /**
     *
     * @param position : type {x, y}
     */
    function addMobileAgent(position) {
        var defaultDirection = {deltaX: 1, deltaY: 0};
        
        if(map.getMobileAgentsByPosition(position).length === 0) // add a mobile agent only if there is none at this position
            addMobileAgentWithDirection(position, defaultDirection);
    }

    /**
     * onMobileAgentInteraction is called when the user interacts on a {@link mobileAgent}.
     * The notion of interaction is defined in the {@link Renderer} object. It can be a click, a focus ...
     *
     * @param id the id of the mobile agent
     *
     * @return object : type {direction: {deltaX, deltaY}}
     */
    function onMobileAgentInteraction(id) {
        return map.onMobileAgentInteraction(id);
    }

    function tick() {
        // Get the next state.
        var result = map.nextStep();

        soundPlayer.playAll(result.wallsInCollision);
        renderer.refresh(result);
    }


    function play() {
        isPlaying = true;
        intervalRef = setInterval(tick, (60/tempo) * 1000);
    }

    function pause() {
        isPlaying = false;
        clearInterval(intervalRef);
    }

    function setTempo(_tempo) {
        tempo = _tempo;

        if (tempo <= 0) {
            tempo = 0;
            forEach(slowTempoBtns,
                function (btn) {
                    btn.disabled = true;
                }
            );
        }

        if (isPlaying) {
            pause();
            play();
        }

        var event = document.createEvent("Event");
        event.initEvent("tempoChangeEvent", false, true);
        event.tempo = tempo;
        document.dispatchEvent(event);
    }

    function decreaseTempo() {
        setTempo(tempo-1);
    }

    function increaseTempo() {
        setTempo(tempo+1);
    }

    function clear() {
        counter = 0;
        map.clear();
        renderer.clear();
    }

    /**
     * Load a given serialized state into the scene and change the current url.
     *
     * @param serializedState the serialized state
     */
    function loadState(serializedState) {
        clear();

        var split = serializedState.split(";");
        tempo = Number(split[1]);

        if (serializedState[0] === '1') {
            for (var i=4; i< split.length; i+=4) {
                addMobileAgentWithDirection({x: Number(split[i]), y: Number(split[i+1])}, {deltaX: Number(split[i+2]), deltaY: Number(split[i+3])});
            }
        }

        var splittedUrl = window.location.href.split('#');

        window.location.href = splittedUrl[0] + '#s=' + serializedState;
    }

    function addSavedStateIntoContainers(serializedState) {
        var savedState =  document.createElement('li');
        savedState.textContent = 'State ' + (++savedStateCount);
        savedState.contentEditable = true;
        savedState.addEventListener('click', function (){loadState(serializedState)}, false);

        forEach(savedStateContainers,
            function (container) {
                container.appendChild(savedState);
            }
        );
    }

    /**
     * Save the current state and add it into the savedStateContainers.
     */
    function saveState() {
        var currentPositions = map.getPositions();

        var serializedState = '';


        serializedState += '1;';
        serializedState += tempo;
        serializedState += ';9;9'; // map size. May be changeable eventually.


         currentPositions.positions.forEach(
			function (e, i, a) {
                serializedState += ';' + e.position.x + ';' + e.position.y + ';' + e.direction.deltaX + ';' + e.direction.deltaY;
            }
        );

        addSavedStateIntoContainers(serializedState);
    }

    /**
     * Import a state from a given url.
     *
     * @param url the given url.
     */
    function importState(url) {
        if (!url) {
            // TODO: Set an error message
            return;
        }

        var splittedUrl = url.split('#');

        if (splittedUrl.length !== 2) {
            // TODO: Set an error message
            return;
        }

        var splittedSerializedState = splittedUrl[1].split('=');

        if (splittedSerializedState.length !== 2 && splittedSerializedState[0] !== 's') {
            // TODO: Set an error message
            return;
        }

        addSavedStateIntoContainers(splittedSerializedState[1]);
        loadState(splittedSerializedState[1]);
    }

    function importStateFromCurrentUrlIfNeeded() {
        if (window.location.href.indexOf('#') !== -1) {
            importState(window.location.href);
        }
    }

    // exposing as a public method as well.
    this.setTempo = setTempo;

    renderer.setOnSquareInteraction(addMobileAgent);
    renderer.setOnMobileAgentInteraction(onMobileAgentInteraction);

    (function(){
        isPlaying = false;

        // INIT SOUNDS
        var walls = map.getWalls();
        var soundsInit = {};

        walls.forEach(function(wall, i){
            var index = (wall.cardinal === "N" || wall.cardinal === "S") ?
                            wall.index :
                            (8 - wall.index);
            var id = wall.cardinal + wall.index;
            
            soundsInit[id] = "http://dl.dropbox.com/u/20485/otomata/sounds/" + index + ".ogg";
        });

        soundPlayer = new SoundPlayer(container, soundsInit);

        // assuming the button is unique for now
        playPauseButton = menu.getElementsByClassName('play-pause-control')[0]; 
        // TODO: Manage errors.
        
        playPauseButton.addEventListener('click', function(event){
            var button = event.target;
            
            // TODO: ignore right clicks.
            
            if(isPlaying){
                pause();
                button.textContent = 'Play'; // TODO: figure out how to get that in sync with similar text in HTML
            }
            else{
                play();
                button.textContent = 'Pause';
            }
        
        }, false);


        saveBtns =  menu.getElementsByClassName('save-control');
        forEach(saveBtns,
            function (btn) {
                btn.addEventListener('click', saveState, false);
            }
        );

        clearBtns =  menu.getElementsByClassName('clear-control');
        forEach(clearBtns,
            function (btn) {
                btn.addEventListener('click', clear, false);
            }
        );

        slowTempoBtns =  menu.getElementsByClassName('decrease-tempo-control');
        forEach(slowTempoBtns,
            function (btn) {
                btn.addEventListener('click', decreaseTempo, false);
            }
        );

        speedTempoBtns =  menu.getElementsByClassName('increase-tempo-control');
        forEach(speedTempoBtns,
            function (btn) {
                btn.addEventListener('click', increaseTempo, false);
            }
        );

        savedStateContainers  = menu.getElementsByClassName('saved-states');

        setTempo(150);

        importStateFromCurrentUrlIfNeeded();
    }).call(this);
}
