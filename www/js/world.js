var World = {

  markerList: [], // list of AR.GeoObjects that are currently shown in the scene / World
  ContentList:[],
  ContentAddOnList:[],
  RecognitionList: [],
  ARchitectObjectList: [], // list of all AR-Objects currently created
  TempLoadingList: [], // list of objects currently loading files from the internet

  currentMarker: null, // the last selected marker
  currentMode: 0, // 0: normal, 1: poi_content view, 2: poi-recognition view
  currentLocation: {},
  currentPoisArrivedState: [],
  currentContentSeenState: -1,
  currentAddOnSeenState: -1,
  currentIrSeenState: -1,

  highestRenderingOrder: 0,

  SingleViewPage: 0,
  SingleViewPages: [],

  narration: {
    next: -1,
    list: [],
    hasEnded: false
  },

  url: null,
  local_url: '',
  server_url: '',
  tour_id: -1,
  UUID: null,
  access_anywhere: false,
  radiusOfAction: 75, // radius around user to distinguish between nearby and far away POIs
  distance: 5000,
  language: 'de',
  story_id: -1,
  session_id: -1,
  sensorsActive: true,

  init: function initFn(json) {
    var data = JSON.parse(json);
    World.local_url = data.local_url;
    World.server_url = data.server_url;
    World.tour_id = data.tour_id;
    World.UUID = data.UUID;
    World.access_anywhere = data.access_anywhere;
    World.distance = data.distance;
    World.language = data.language;
    World.story_id = data.story_id;
    World.session_id = data.session_id;
    World.narration.next = data.nextState;

    World.handleTranslations();

    /* Disable all sensors in "IR-only" Worlds to save performance. If the property is set to true, any geo-related components (such as GeoObjects and ActionRanges) are active. If the property is set to false, any geo-related components will not be visible on the screen, and triggers will not fire.*/
    if(!data.pois_with_gps) {
      AR.context.services.sensors = false;
      World.sensorsActive = false;
    }

    // load wtc_file if there is one
    if(data.wtc_file != "") this.tracker = new AR.Tracker(data.local_url + data.wtc_file);
    
    // go through all POIs
    for(var i = 0; i < data.pois.length; i++) {
      var poi = data.pois[i];
      poi.location = new AR.GeoLocation(poi.latitude, poi.longitude, poi.altitude);
      var dist = poi.location.distanceToUser();
      poi.distance = !isNaN(dist)? dist : 0.0;
      World.markerList.push(new Marker(poi));
    }

    // go through all POI-Contents
    for(var i = 0; i < data.poi_contents.length; i++) {
      var cont = data.poi_contents[i];
      if(cont.relation_type == 1) {
        World.ContentList.push(cont);
      } else {
        World.ContentAddOnList.push(cont);
      }  
    }
    
    // go through all POI-Recognitions
    for(var i = 0; i < data.poi_recognitions.length; i++) {
      World.RecognitionList.push(data.poi_recognitions[i]);
    }

    // if there are any POIs
    if(World.markerList.length > 0) {
      AR.context.onLocationChanged = World.locationChanged;
      AR.context.onScreenClick = World.onScreenClick;
      
      World.locationChanged(data.latitude, data.longitude, 0.0, 1.0);
    }
  },

  onScreenClick: function onScreenClickFn() {
    $('.navbarx-collapse.in').collapse('hide');
    if( World.currentMode == 0
      && World.currentMarker 
      && World.currentMarker.isSelected 
      && !Marker.prototype.isAnyAnimationRunning(World.currentMarker)) {
      Marker.prototype.setDeselected(World.currentMarker);
      $("#footer").hide();
    }
  },

  locationChanged: function locationChangedFn(latitude, longitude, alt, acc) {
    World.currentLocation = {
      'latitude': latitude,
      'longitude': longitude,
      'altitude': 0.0,
      'accuracy': 1.0
    };

    var topNavbarItems = [];
    var pois_arrived = [];
    var geoObjects = [];
    
    // clustering: separate POIs into segments in order to avoid overlapping
    // first parameter stands for the size of the angle
    if (World.markerList.length > 0) {
      geoObjects = ClusterHelper.createClusteredPlaces(30, World.currentLocation, World.markerList);
    }

    for(var i = 0; i < geoObjects.length; i++) {
      var heightArray = [
        [0, 0], // >   75
        [0, 0], // >  150
        [0, 0], // >  300
        [0, 0], // >  600
        [0, 0], // > 1200
        [0, 0]  // > 2000
      ];
      var index = 0;
      var height = 0;
      var inc = 20;

      for(var j = 0; j < geoObjects[i].places.length; j++) {
        var poi = geoObjects[i].places[j];
        var poiLocation = new AR.GeoLocation(poi.latitude, poi.longitude);
        var distanceToUser = poiLocation.distanceToUser();

        if(World.access_anywhere || distanceToUser <= World.radiusOfAction) {
          for(var n = 0; n < World.markerList.length; n++) {
            if(World.markerList[n].poi.id == poi.id) {
              World.markerList[n].markerObject.enabled = false;
              topNavbarItems.push(World.markerList[n]);
              pois_arrived.push(World.markerList[n].poi.id);
            }
          }
        } else {
          if(!isNaN(distanceToUser) && j > 0) {
            poi.distance = distanceToUser;
            
            /*
            if(distanceToUser > 2000) height += 140.0 * factor;
            else if(distanceToUser > 1500) height += 125.0 * factor;
            else if(distanceToUser > 750) height += 110.0 * factor;
            else if(distanceToUser > 500) height += 90.0 * factor;
            else if(distanceToUser > 250) height += 50.0 * factor;
            else if(distanceToUser > 50) height += 30.0 * factor;
            */

            if (distanceToUser > 2000) height += 160.0 * j;
            else if (distanceToUser > 1800) height += 120.0 * j;
            else if (distanceToUser > 1200) height += 100.0 * j;
            else if (distanceToUser > 600) height += 80.0 * j;
            else if (distanceToUser > 300) height += 50.0 * j;
            else if (distanceToUser > 150) height += 40.0 * j;
            else if (distanceToUser > 75) height += 20.0 * j;

            /*
            if(distanceToUser > 2000) {
              index = 5;
              inc = 160;
            } else if(distanceToUser > 1200) {
              index = 4;
              inc = 135;
            } else if(distanceToUser > 600) {
              index = 3;
              inc = 110;
            } else if(distanceToUser > 300) {
              index = 2;
              inc = 70;
            } else if(distanceToUser > 150) {
              index = 1;
              inc = 50;
            }

            height = heightArray[index][1];
            heightArray[index][0]++;
            var factor = Math.pow(2, Math.log(heightArray[index][0])) * 1.25;
            heightArray[index][1] =  inc * factor;
            */
          }

          for(var n = 0; n < World.markerList.length; n++) {
            if(World.markerList[n].poi.id == poi.id) {
              World.markerList[n].markerObject.enabled = true;
              World.markerList[n].poi.location.altitude = parseFloat(height);

              // if narration is active, change/show border-color of active POI
              if(World.story_id > -1) {
                var borderColor = World.markerList[n].borderColor;
                var newBorderColor = 'gray';

                if(poi.id == World.narration.next) {
                  newBorderColor = 'yellow';
                }

                if(borderColor != newBorderColor) {
                  var source = $("#poi_icon").html();
                  var template = Handlebars.compile(source);

                  var context = {
                    id: poi.id,
                    local_url: World.local_url + poi.icon_file,
                    title: decodeURI(poi.title),
                    borderColor: newBorderColor
                  };

                  var img = template(context);
                  World.markerList[n].markerDrawable_selected.html = img;
                  World.markerList[n].markerDrawable_idle.html = img;
                  World.markerList[n].borderColor = newBorderColor;
                }
              }

              var dist = Math.round(distanceToUser) / 1000;
              if(!isNaN(dist)) World.markerList[n].distanceLabel.text = ((dist > 9.9)? ' > 9.9 ' : ' ' + dist.toFixed(2)) + ' km ';
            }
          }
        }
      }
    }

    if(World.story_id > -1 && pois_arrived.length > 0) World.reportState(pois_arrived, 'poisArrived');
    if(topNavbarItems.length == World.markerList.length) {
      if(World.sensorsActive) {
        AR.context.services.sensors = false;
        World.sensorsActive = false;
      }
    } else {
      if(!World.sensorsActive) {
        AR.context.services.sensors = true;
        World.sensorsActive = true;
      }
    }

    if(World.currentMode == 0) World.updateTopNavbar(topNavbarItems);
  },

  handleTranslations: function() {
    var overview = 'Übersicht';
    var image_recognition = 'Bilderkennung';
    var row_list_header = 'Erfahre mehr über diesen Ort';
    var btn_audio = 'Audio abspielen';
    var btn_video = 'Video abspielen';
    var btn_close = 'Fenster schließen';
    var btn_next = 'weiter';
    var btn_prev = 'zurück';

    if(World.language == 'en') {
      overview = 'Overview';
      image_recognition = 'Image recognition';
      row_list_header = 'Learn more about this location';
      btn_audio = 'Play audio';
      btn_video = 'Play video';
      btn_close = 'Close window';
      btn_next = 'next';
      btn_prev = 'previous';
    }

    $('span.title.cont').text(overview);
    $('span.title.ir').text(image_recognition);
    $('.container.overview .row.list h5').text(row_list_header);
    $('.btn-audio').text(btn_audio);
    $('.btn-video').text(btn_video);
    $('.btn-close').text(btn_close);
    $('.btn-next').text(btn_next);
    $('.btn-prev').text(btn_prev);
  },

  updateTopNavbar: function(items) {
    items.sort(function(a, b){
      if (a.poi.distance > b.poi.distance) {
        return 1;
    }
    if (a.poi.distance < b.poi.distance) {
        return -1;
    }
    // a must be equal to b
    return 0;
    });

    if(items.length > 0) {
      var first = items.pop();
      $('button.btn-title').show();
      $('button.btn-title').off('click').on('click', Marker.prototype.getOnClickTrigger(first, false));
      var title = decodeURI(first.poi.title);
      $('button.btn-title span.title').text(title);

      $('button.dropdown-toggle').show();
      if(items.length > 0) {
        $('button.dropdown-toggle').attr('disabled', false);
        $('.nav-poi').html('');
        for(var i in items) {
          var title = decodeURI(items[i].poi.title);
          var html_poi = $('<li></li>').append(
            $('<button type="button" class="btn btn-default btn-sm btn-toggle"><span class="icon-direction"></span>&nbsp;&nbsp;'+title+'</button>').off('click')
            .on('click', Marker.prototype.getOnClickTrigger(items[i], false))
          )
          $('.nav-poi').append(html_poi);
        }
      } else {
        $('button.dropdown-toggle').attr('disabled', true);
      }
    } else {
      $('button.dropdown-toggle').hide();
      $('button.btn-title').hide();
    }
  },

  // report that a poi was clicked
  reportState: function(object, type, callback) {
    var data = {
      ref_project_id: World.tour_id,
      story_id: World.story_id,
      session_id: World.session_id,
      UUID: World.UUID,
      use_nr: true,
      currentLocation: World.currentLocation,
      metadata: {
        type: type
      },
      time: Date.now()
    }

    switch(type) {
      case 'poisArrived':
        if(arrays_equal(World.currentPoisArrivedState, object)) return;
        else World.currentPoisArrivedState = object;
        data.metadata.list = object;
        break;
      case 'poiClicked':
        data.metadata.id = object.id;
        data.metadata.distance = object.distance;
        break;
      case 'contentSeen':
        if(World.currentContentSeenState == object.id) return;
        else World.currentContentSeenState = object.id;
        data.metadata.id = object.id;
        data.metadata.distance = object.distance;
        break;
      case 'addOnSeen':
        if(World.currentAddOnSeenState == object.id) return;
        else World.currentAddOnSeenState = object.id;
        data.metadata.id = object.id;
        break;
      case 'irSeen':
        if(World.currentIrSeenState == object.id) return;
        else World.currentIrSeenState = object.id;
        data.metadata.id = object.id;
        break;
    }

    var requestUrl = World.server_url + 'memorizer/receiver/handleStateReport.json';
    $.ajax({
      url: requestUrl,
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      type: 'PUT',
      crossDomain: true,
      data: data,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('pragma', 'no-cache');
        xhr.setRequestHeader('Cache-Control', 'no-cache,max-age=0');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      }
    }).done(function(result) {
      if(result) {
        console.log(JSON.stringify(result));

        if(result.next) {
          World.narration.next = parseInt(result.next[0]);
          World.locationChanged(World.currentLocation.latitude, World.currentLocation.longitude, 0.0, 1.0);

          // check if narration has ended
          if(World.narration.next == -1 && !World.narration.hasEnded) {
            World.narration.hasEnded = true;
            World.showNarrationFinishedModal();
          }
        } else if(result.list) {
          World.narration.list = result.list;

          if(isFunction(callback)) {
            callback();
          }
        }
      }
    }).fail(function(jqXHR, textStatus) {
      console.log("Request failed: " + textStatus);
      if(isFunction(callback)) {
        callback();
      }
    });
  },

  showNarrationFinishedModal: function() {
    var body = 'Glückwunsch, Du hast die letzte Station erreicht und damit zum Ausgangspunkt dieser Tour zurückgefunden. Die Narration endet nun hier.';
    var lblClose = 'schließen';
    switch(World.language) {
      case 'en':
        body = 'Congratulations, you&apos;ve reached the last station and thus found your way back to the starting point of this tour. The narration now ends here.';
        lblClose = 'close';
        break;
    }
    $('#narrationFinishedModal .modal-body').html(body);
    $('#narrationFinishedModal .modal-footer .nr-close').show().text(lblClose);
    $('#narrationFinishedModal').modal('show');
  },

  closeNarrationFinishedModal: function() {
    $('#narrationFinishedModal').modal('hide');
  },
  playVideo: function playVideoFn(el) {
     World.url = World.url || $(el).data('mediasrc');
     var video = new AR.VideoDrawable(World.local_url + World.url, 0.5, {
      onLoaded: function() {
        console.log('video file loaded');
        video.destroy();
        AR.context.startVideoPlayer(World.local_url + World.url);
      },
      onError : function(){
        console.log('could not load video file');
        video.destroy(); 
        AR.logger.debug('could not load video file:'+World.local_url + World.url);
        AR.logger.error('LOCALURL: '+ World.local_url);
        AR.logger.error('URL: ' + World.url);
      }
   });
  },

  playAudio: function playAudioFn(el) {
    World.url = World.url || $(el).data("mediasrc");
    AR.logger.debug($(el).data("mediasrc"));
    var sound = new AR.Sound(World.local_url + World.url, {
      onLoaded: function() {
        console.log('sound file loaded');
        sound.destroy();
        AR.context.startVideoPlayer(World.local_url + World.url);
      },
      onError : function(){
        console.log('could not load sound file');
        sound.destroy();
        AR.logger.debug('could not load sound file:'+World.local_url + World.url);
      }
    });
    sound.load();
  },

  closeWikitude: function closeWikitude() {
    document.location = 'architectsdk://actionButton?action=close';
    console.log("Wikitude closed");
  },

  closePopup: function closePopup() {
    $("#infoboxImg").hide();
    $("#irVideo").hide();
    $("#irAudio").hide();
    $('#infobox').hide();
    $('.navbar').show();
    //next two lines only on iOS to keep world smooth !!!
    //AR.context.destroyAll();
    //World.loadPoisFromJsonData(World.poiTemp);
  },
  
  createIRPOI: function createIRPOI(poi) {
    // create popup
    if(poi.display_type == 0) {
      createPoiPopup(poi);

    // create overlay
    } else {
      if(poi.overlay_type == 0) {
        create2DOverlay(poi);
      } else {
        create3DOverlay(poi);
      }
    }
  },

  setAndShowContent: function setAndShowContent(description, mimetype, file) {
    $("#infoboxDesc").text(description); 
    if(file) {
      World.url = file;
      switch(mimetype) {
        case "audio/mp3":
          $("#infoboxImg").hide();
          $("#irVideo").hide();
          $("#irAudio").show();
          break;

        case "image/png":
          $('#infoboxImg img').attr("src", World.local_url + file);
          $('#infoboxImg img').one('error', function() { 
            this.src = World.server_url + file;
          });
          $("#infoboxImg").show();
          $("#irVideo").hide();
          $("#irAudio").hide();
          break;

        case "video/mp4":
          $("#infoboxImg").hide();
          $("#irVideo").show();
          $("#irAudio").hide();
          break;

        default: 
          $("#infoboxImg").hide();
          $("#irVideo").hide();
          $("#irAudio").hide();
          World.url = '';
          break;
      }
    }
    $("#infobox").show();
  }
}

function createPoiPopup(poi) {
  var img = new AR.ImageResource("img/empty.png");
  var overlay = new AR.ImageDrawable(img, 1, {
    offsetX: 0.12,
    offsetY: -0.01
  });
  
  var page = new AR.Trackable2DObject(World.tracker, poi.tracking_id , {
    drawables: { cam:overlay },
    onEnterFieldOfVision: function() {
      $('.navbar').hide();
      if(World.story_id > -1) World.reportState(poi, 'irSeen');
      var text = decodeURI(poi.text);
      World.setAndShowContent(text, poi.media_mimetype, poi.media_file);
    }
  });

  page.remove = function() {
    console.log('popup page removed');
    img.destroy();
    overlay.destroy();
    page.destroy();
  };

  World.ARchitectObjectList.push(page);
}

function create2DOverlay(poi) {
  var options =  {
    offsetX: poi.translation_x,
    offsetY: poi.translation_y,
    zOrder: 1,
    onClick: function() {
      var text = decodeURI(poi.text);
      World.setAndShowContent(text, poi.media_mimetype, poi.media_file);
    }
  };

  var img = new AR.ImageResource(World.local_url + poi.overlay_file, {
    onLoaded: function() {
      console.log('loaded local overlay file');
      var overlay = createImageDrawable(poi, options, img);
      create2DOverlayPage(poi, img, overlay);
    },
    onError: function() {
      console.log('could not load local overlay file');
      img.destroy();

      img = new AR.ImageResource(World.server_url + poi.overlay_file, {
        onLoaded: function() {
          console.log('loaded server overlay file');
          var overlay = createImageDrawable(poi, options, img);
          create2DOverlayPage(poi, img, overlay);
        },
        onError: function() {
          console.log('could not load server overlay file');
          img.destroy();
        }
      });

      if(img) World.TempLoadingList.push(img);
    }
  });

  if(img) World.TempLoadingList.push(img);
}

function createImageDrawable(poi, options, img) {
  return new AR.ImageDrawable(img, poi.scaling_x, options);
}

function create2DOverlayPage(poi, img, overlay) {
  var page = new AR.Trackable2DObject(World.tracker, poi.tracking_id , {
    drawables: { cam:overlay },
    onEnterFieldOfVision: function() {
      //$('.navbar').hide();
      if(World.story_id > -1) World.reportState(poi, 'irSeen');
    }
  });

  page.remove = function() {
    console.log('2d overlay page removed');
    img.destroy();
    overlay.destroy();
    page.destroy();
  };

  World.ARchitectObjectList.push(page);
}

function create3DOverlay(poi) {
  var scale = {
    x: poi.scaling_x,
    y: poi.scaling_y,
    z: poi.scaling_z
  };

  var translate = {
    x: poi.translation_x,
    y: poi.translation_y,
    z: poi.translation_z
  };

  var rotate = {
    tilt: poi.rotation_x,
    heading: poi.rotation_y,
    roll: poi.rotation_z
  };

  var model = new AR.Model(World.local_url + poi.wt3_file, {
    onLoaded: function() {
      console.log('loaded local wt3 file');
      create3DOverlayPage(poi, model);
    },
    onError: function() {
      console.log('could not load local wt3 file');

      model.destroy();
      model = new AR.Model(World.server_url + poi.wt3_file, {
        onLoaded: function() {
          console.log('loaded server wt3 file');
          create3DOverlayPage(poi, model);
        },
        onError: function() {
          console.log('could not load server wt3 file');
          model.destroy();
        },
        scale: scale,
        translate: translate,
        rotate: rotate,
        onClick: function() {
          var text = decodeURI(poi.text);
          World.setAndShowContent(text, poi.media_mimetype, poi.media_file);
        }
      });
      if(model) World.TempLoadingList.push(model);
    },
    scale: scale,
    translate: translate,
    rotate: rotate,
    onClick: function() {
      var text = decodeURI(poi.text);
      World.setAndShowContent(text, poi.media_mimetype, poi.media_file);
    }
  });

  if(model) World.TempLoadingList.push(model);
}

function create3DOverlayPage(poi, model) {
  var page = new AR.Trackable2DObject(World.tracker, poi.tracking_id, {
    drawables: { cam: [model] },
    onEnterFieldOfVision: function() {
      //$('.navbar').hide();
      if(World.story_id > -1) World.reportState(poi, 'irSeen');
      //this.appear;
    }
  });

  page.remove = function() {
    console.log('model page removed');
    model.destroy();
    page.destroy();
  };

  World.ARchitectObjectList.push(page);
}

function isFunction(functionToCheck) {
 var getType = {};
 return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}