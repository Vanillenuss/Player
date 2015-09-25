var app = {

    cons: {
      SERVER_URL: 'http://infogrid.mesh.de/',
      LOGIN_URL: 'users/canLogin.json',
      LOGOUT_URL: 'users/logout',
      POI_URL: 'player/data/pois?',
      TOURDATE_URL: 'player/data/tourdates?',
      DISTANCE: 20000,
      LAT_LUEBECK: 53.8676066, // Lübeck Kohlmarkt
      LNG_LUEBECK: 10.6867008, //53.8676066, 10.6867008
    },
    
    defaults: {
      content: $('.content').html(),

      availableStories: [],
      activeStorySessions: [],
      currentTour: null,
      selectedNarration: -1,
      selectedSession: -1,
      nextState: -1,
    },

    isDeviceSupported: false,
    data: null,

    // Application Constructor
    initialize: function() {
      this.bindEvents();
      this.reset();
    },

    reset: function() {
      this.data = $.extend({}, this.defaults);
    },

    restoreLoginContent: function() {
      $('.content').html(app.data.content);
      $('div.content').removeClass('list');
      setHeaderVisibility(false);
      setFooterVisibility(true);
      this.reset();
      if(FileHandler.getFileSystem() == null) {
        FileHandler.data.fsIsInit = false;
        FileHandler.initializeFileSystem(function() {
          app.receivedEvent('content');
        });
      } else {
        app.receivedEvent('content');
      }
    },

    /**
     *  This function extracts an url parameter
     */
    getUrlParameterForKey: function(url, requestedParam) {
      requestedParam = requestedParam.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
      var regexS = "[\\?&]" + requestedParam + "=([^&#]*)";
      var regex = new RegExp(regexS);
      var results = regex.exec(url);

      if(results == null) return "";
      else {
        var result = decodeURIComponent(results[1]);
        return result;
      }
    },

    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
      document.addEventListener("deviceready", this.onDeviceReady, false);
      document.addEventListener('backbutton', function (event) {
           setContentVisibility(true);
           setHeaderVisibility(true);
           setHeaderControlsVisibility(true);
      }, false);

    },

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {

      //
      // JayData
      //

      // define tourdate data model
      $data.Entity.extend("$IGDB.Tourdate", {
        id: { type: "int", key: true },
        title: {type: "string"},
        // following information not used:
        //group: {type: "int"},
        //creator: {type: "int"},
        description: {type: "string"},
        //privacy_type: {type: "int"},
        access_anywhere: {type: "boolean"},
        latitude: {type: "number"},
        longitude: {type: "number"},
        icon_file: {type: "string"},
        wtc_file: {type: "string"},
        modified: {type: "int"}
      });

      // define POI data model
      $data.Entity.extend("$IGDB.Poi", {
        id: { type: "int", key: true },
        tour_id: { type: "int" },
        enabled: {type: "boolean"},
        relation_type: { type: "int" },
        relation_id: { type: "int" },
        title: {type: "string"},
        short_text: {type: "string"},
        latitude: {type: "number"},
        longitude: {type: "number"},
        altitude: {type: "number"},
        icon_file: {type: "string"},
        modified: {type: "int"}
      });

      // define POI-Content data model
      $data.Entity.extend("$IGDB.PoiContent", {
        id: { type: "int", key: true },
        tour_id: { type: "int" },
        enabled: {type: "boolean"},
        relation_type: { type: "int" },
        relation_id: { type: "int" },
        add_on_type: { type: "int" },
        title: {type: "string"},
        text: {type: "string"},
        media_file: {type: "string"},
        language: {type: "string"},
        media_mimetype: {type: "string"},
        modified: {type: "int"}
      });

      // define POI-Recognition data model
      $data.Entity.extend("$IGDB.PoiRecognition", {
        id: { type: "int", key: true },
        tour_id: { type: "int" },
        enabled: {type: "boolean"},
        relation_type: { type: "int" },
        relation_id: { type: "int" },
        add_on_type: { type: "int" },
        title: {type: "string"},
        text: {type: "string"},
        tracking_id: {type: "string"},
        display_type: {type: "boolean"},
        overlay_type: {type: "boolean"},
        media_file: {type: "string"},
        media_mimetype: {type: "string"},
        wt3_file: {type: "string"},
        overlay_file: {type: "string"},
        overlay_mimetype: {type: "string"},
        rotation_x: {type: "number"},
        rotation_y: {type: "number"},
        rotation_z: {type: "number"},
        scaling_x: {type: "number"},
        scaling_y: {type: "number"},
        scaling_z: {type: "number"},
        translation_x: {type: "number"},
        translation_y: {type: "number"},
        translation_z: {type: "number"},
        modified: {type: "int"}
      });

      $data.EntityContext.extend("$IGDB.Context", {
        Tourdates: { type: $data.EntitySet, elementType: $IGDB.Tourdate },
        Pois: { type: $data.EntitySet, elementType: $IGDB.Poi },
        PoiContents: { type: $data.EntitySet, elementType: $IGDB.PoiContent },
        PoiRecognitions: { type: $data.EntitySet, elementType: $IGDB.PoiRecognition }
      });

      // check if the current device is able to launch ARchitect Worlds
      app.wikitudePlugin = cordova.require("com.wikitude.phonegap.WikitudePlugin.WikitudePlugin");                   
      app.wikitudePlugin.isDeviceSupported(app.onDeviceSupportedCallback, app.onDeviceNotSupportedCallback,["geo","2d_tracking"]);

      FileHandler.init();

      // get and store latitude and longitude
      setLatLon();
    },

    /**
    * This function gets if the ARchitect World finished loading
    */
    onARchitectWorldLaunchedCallback : function() {
        app.report('ARchitect World launched');
    },
                                                  
    /**
    * This function gets if the ARchitect failed loading
    */
    onARchitectWorldFailedLaunchingCallback : function(err) {
        app.report('ARchitect World failed launching');
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
      if(id == 'content') {

        // generate unique ID for this device / user
        if(!localStorage.getItem('UUID')) {
          localStorage.setItem('UUID', generateUUID());
        }

        if(localStorage.getItem('_loggedIn') === "true") {
          setHeaderVisibility(true);
          setFooterVisibility(false);
          loadTourlist();
          
          // hide splash screen
          navigator.splashscreen.hide();
        } else {
          localStorage.removeItem('WEB_DB');

          setContentVisibility(true);

          // fill inputs with last known data
          $('input.username').val(localStorage.getItem('_username'));
          if(localStorage.getItem('_remember') == 'true') $('input[name=remember]').attr('checked', true);

          checkIfUserAndPasswordAreEmpty();

          $(document).off('submit','form.login');
          $(document).on('submit','form.login', function() {
            $('div.alert').hide();
            setContentVisibility(false);

            localStorage.setItem('_userID', '0');
            localStorage.setItem('_remember', $('input[name="remember"]')[0].checked);

            if(localStorage.getItem('_remember') == 'true') localStorage.setItem('_username', $('input.username').val());

            $.ajax({
              url: app.cons.SERVER_URL + app.cons.LOGIN_URL,
              dataType: 'json',
              xhrFields: {
                withCredentials: true
              },
              crossDomain: true,
              beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', getAuth($('input.username').val(), $('input.password').val()));
                xhr.setRequestHeader('pragma', 'no-cache');
                xhr.setRequestHeader('Cache-Control', 'no-cache,max-age=0');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
              }
            }).done(function(data, textStatus, jqXHR) {
              localStorage.setItem('_userID', data.data.id);
              localStorage.setItem('_language', data.data.language);
              localStorage.setItem('_loggedIn', "true");
              setHeaderVisibility(true);
              setFooterVisibility(false);
              loadTourlist();
            }).fail(function(jqXHR, textStatus) {
              console.log("Login request failed: " + textStatus);
              if(jqXHR.status == 403 || (jqXHR.status == 404 && jqXHR.responseJSON.data == 'Invalid post data')) $('div.alert.alert1').show();
              else $('div.alert.alert2').show();
              setContentVisibility(true);
            });
          });

          $('.selectpicker').selectpicker();
          $('button.login_guest').click(function() {
              $('div.alert').hide();
              setContentVisibility(false);
              $.ajax({
                url: app.cons.SERVER_URL + app.cons.LOGIN_URL,
                dataType: 'json',
                xhrFields: {
                  withCredentials: true
                },
                crossDomain: true,
                beforeSend: function(xhr) {
                  xhr.setRequestHeader('Authorization', 'Basic Z3Vlc3Q6QmVNeUd1ZXN0IQ==');
                  xhr.setRequestHeader('pragma', 'no-cache');
                  xhr.setRequestHeader('Cache-Control', 'no-cache,max-age=0');
                  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                }
              }).done(function(data, textStatus, jqXHR) {
                localStorage.setItem('_userID', '0');
                localStorage.setItem('_language', $('.selectpicker').val());
                localStorage.setItem('_loggedIn', "true");
                setHeaderVisibility(true);
                setFooterVisibility(false);
                loadTourlist();
              }).fail(function(jqXHR, textStatus) {
                console.log("Login request failed: " + textStatus);
                if(jqXHR.status == 403 || (jqXHR.status == 404 && jqXHR.responseJSON.data == 'Invalid post data')) $('div.alert.alert1').show();
                else $('div.alert.alert2').show();
                setContentVisibility(true);
              });
          });

          // hide splash screen
          navigator.splashscreen.hide();
        }
      } else {
        console.log('receivedEvent: ' + id);
      }
    },

    // A callback which gets called if the device is able to launch ARchitect Worlds
    onDeviceSupportedCallback: function() {
        app.isDeviceSupported = true;
        app.receivedEvent('Device supported');
        app.wikitudePlugin.setOnUrlInvokeCallback(app.onClickInARchitectWorld);
    },
    
    // A callback which gets called if the device is not able to start ARchitect Worlds
    onDeviceNotSupportedCallback: function() {
        app.receivedEvent('Unable to launch ARchitect Worlds on this device (Device not supported)');
    }, 
    loadARchitectWorld: function() {
        if (app.isDeviceSupported) {            
            app.wikitudePlugin.loadARchitectWorld(
                function() 
                {
                    app.receivedEvent("World loaded")
                }
                , function() 
                {
                    app.receivedEvent("World lfailed to load")
                }
                ,"www/ar.html"
                , ["geo","2d_tracking"]
            );
        } else {
            setContentVisibility(true);
            setHeaderControlsVisibility(true);
            alert("Device is not supported");
        }
    },
    onClickInARchitectWorld: function(url) {
        app.report('url: ' + url);
        if (app.getUrlParameterForKey(url, 'text')) {
          app.report("you clicked on a label with text: " + app.getUrlParameterForKey(url, 'text'));
        } else if (app.getUrlParameterForKey(url, 'action')) {
          switch(app.getUrlParameterForKey(url, 'action')) {
            case 'close': 
                app.wikitudePlugin.close();
                setContentVisibility(true);
                setHeaderVisibility(true);
                setHeaderControlsVisibility(true);
              break;
            case 'reloadTourdata':
                loadTourlist();
                break;
          }
        } else if (app.getUrlParameterForKey(url, 'status')) {
          app.wikitudePlugin.hide();
        }
    },    
    onScreenCaptured: function (absoluteFilePath) {
        alert("snapshot stored at:\n" + absoluteFilePath);
    },
    
    onScreenCapturedError: function (errorMessage) {
        alert(errorMessage);
    },
    
    report: function(id) {
      console.log("report:" + id);
    }
};

function setDownloadProgressVisibility(isVisible) {
  if(isVisible) {
    $('div.download-progress').show();
  } else {
    $('div.download-progress').hide();
  }
}

function setContentVisibility(isVisible) {
  if(isVisible) {
    $('div.content').show();
    $('header h1').show();
  } else {
    $('div.content').hide();
    $('header h1').hide();
  }
}

function setHeaderVisibility(isVisible) {
  if(isVisible) {
    $('header').show();
  } else {
    $('header').hide();
  }
}

function setFooterVisibility(isVisible) {
  if(isVisible) {
    $('footer').show();
  } else {
    $('footer').hide();
  } 
}

function setHeaderControlsVisibility(isVisible) {
  if(isVisible) {
    $('header button.back').show();
    $('header button.refresh').show();
  } else {
    $('header button.back').hide();
    $('header button.refresh').hide();
  }
}

function setLatLon() {
  navigator.geolocation.getCurrentPosition(
    geolocationOnSuccess,
    geolocationOnError,
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );
}

// onSuccess Callback
// This method accepts a Position object, which contains the
// current GPS coordinates
function geolocationOnSuccess(position) {
  localStorage.setItem('lat', position.coords.latitude);
  localStorage.setItem('lon', position.coords.longitude);

  if(FileHandler.getFileSystem() == null) {
    FileHandler.data.fsIsInit = false;
    FileHandler.initializeFileSystem(function() {
      app.receivedEvent('content');
    });
  } else {
    app.receivedEvent('content');
  }
}

// onError Callback receives a PositionError object
function geolocationOnError(error) {

  switch(error.code) {
    case error.PERMISSION_DENIED:
      console.log('User denied the request for Geolocation.');
      break;
    case error.POSITION_UNAVAILABLE:
      console.log('Location information is unavailable.');
      break;
    case error.TIMEOUT:
      console.log('The request to get user location timed out.');
      break;
    case error.UNKNOWN_ERROR:
      console.log('An unknown error occurred.');
      break;
  }


  localStorage.setItem('lat', app.cons.LAT_LUEBECK);
  localStorage.setItem('lon', app.cons.LNG_LUEBECK);

  if(FileHandler.getFileSystem() == null) {
    FileHandler.data.fsIsInit = false;
    FileHandler.initializeFileSystem(function() {
      app.receivedEvent('content');
    });
  } else {
    app.receivedEvent('content');
  }
}

function loadTourlist() {
  var h1 = 'Touren in der Umgebung';
  var warning = 'Es konnten keine Tourdaten gefunden werden.<br>Es besteht eventuell keine Verbindung zum Internet.';
  switch(localStorage.getItem('_language')) {
    case 'en': 
      h1 = 'Tours of the surrounding area';
      warning = 'No tours have been found.<br>There may be a problem with your internet connection.';
      break;
  }
  $('header h1').text(h1);
  setContentVisibility(false);
  setHeaderControlsVisibility(false);

  var source = $("#list_view").html();
  var template = Handlebars.compile(source);

  $('div.content').html(template);
  $('div.content').addClass('list');
  $('.alert > p.text-center').html(warning);
  loadTourData();
}

// Login Base64 Encoding and Local Storage for later usage within the application
// Needed for Cross Domain Requests
function getAuth(name, pwd) {
    var bytes = Crypto.charenc.Binary.stringToBytes(name+':'+pwd);
    var base64 = Crypto.util.bytesToBase64(bytes);
    return "Basic " + base64;
}

function logout(withConfirmation) {
  if(typeof withConfirmation == 'undefined') withConfirmation = true;
  var confirmed = true;
  /*
  if(withConfirmation && localStorage.getItem('_userID') == '0') {
    var text = 'Achtung beim Logout gehen alle gespeicherten Daten verloren.';
    switch(localStorage.getItem('_language')) {
      case 'en': text = 'Attention all stored data will be lost on logout.'; break;
    }
    confirmed = confirm(text);
  }
  */

  if(confirmed) {
    setContentVisibility(false);
    setHeaderControlsVisibility(false);
    $.ajax({
      url: app.cons.SERVER_URL + app.cons.LOGOUT_URL,
      xhrFields: {
        withCredentials: true
      },
      crossDomain: true,
      beforeSend: function(xhr) {
       xhr.setRequestHeader('pragma', 'no-cache');
       xhr.setRequestHeader('Cache-Control', 'no-cache,max-age=0');
       xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      }
    }).done(function(data, textStatus, jqXHR) {
      localStorage.setItem('_loggedIn', "false");
      localStorage.setItem('_userID', '0');
      localStorage.removeItem('WEB_DB');
      if(localStorage.getItem('_remember') != 'true') localStorage.setItem('_username', '');
      FileHandler.removeFolder('', function() { app.restoreLoginContent();});

    }).fail(function(jqXHR, textStatus) {
      console.log("Logout request failed: " + textStatus);

      localStorage.setItem('_loggedIn', "false");
      localStorage.setItem('_userID', '0');
      localStorage.removeItem('WEB_DB');
      if(localStorage.getItem('_remember') != 'true') localStorage.setItem('_username', '');
      FileHandler.removeFolder('', function() { app.restoreLoginContent();});
    });
  }
}

// calculate distance in kilometers
function calculateDistance(latDest, lonDest) {
  // Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2011 - www.movable-type.co.uk/scripts/latlong.html
  // where R is earth’s radius (mean radius = 6,371km);
  // note that angles need to be in radians to pass to trig functions!

  var R = 6371; // km
  var dLat = (latDest-Number(localStorage.getItem('lat'))).toRad();
  var dLon = (lonDest-Number(localStorage.getItem('lon'))).toRad();
  var lat1 = Number(localStorage.getItem('lat')).toRad();
  var lat2 = latDest.toRad();

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  
  return Math.round((R * c) * 100) / 100;
}

/** Converts numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }
}

function isWifiOrEthernetConnection() {
  var networkState = navigator.connection.type;
  return (networkState == Connection.WIFI || networkState == Connection.ETHERNET);
}

function imgOnError(img) {
  var serverURL = img.dataset.serverurl;
  console.log('imgOnError ' + serverURL);
  img.src = (serverURL && serverURL != img.src)? serverURL : 'img/no-image.png';
}

function isFunction(functionToCheck) {
 var getType = {};
 return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function setLoginNormalButtonDisabled(isDisabled) {
  if(isDisabled) {
    $('button.login_normal').prop('disabled', true);
  } else {
    $('button.login_normal').prop('disabled', false);
  }
}

function checkIfUserAndPasswordAreEmpty() {
  var uLen = $('input.username').val().length;
  var pLen = $('input.password').val().length;
  if(uLen > 0 && pLen > 0) setLoginNormalButtonDisabled(false);
  else setLoginNormalButtonDisabled(true);
}

function generateUUID(){
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x7|0x8)).toString(16);
  });
  return uuid;
}