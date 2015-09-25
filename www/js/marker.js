var kMarker_AnimationDuration_ChangeDrawable = 500;
var kMarker_AnimationDuration_Resize = 750;

function Marker(data) {
  this.poi = data;
  this.isSelected = false;
  this.borderColor = 'gray';
  this.order = 0;

  // New: Two animation groups managing the animations used during selection/deselection 
  this.animationGroup_idle = null;
  this.animationGroup_selected = null;
  
  // create icon
  var title = decodeURI(this.poi.title);

  var source = $("#poi_icon").html();
  var template = Handlebars.compile(source);

  var context = {
    id: data.id,
    local_url: World.local_url + this.poi.icon_file,
    title: title,
    borderColor: this.borderColor
  };

  var img = template(context);

  var options = {
    zOrder: 0,
    opacity: 1.0,
    viewportWidth: 160,
    viewportHeight: 90,
    scale: 0.8,
    horizontalAnchor : AR.CONST.HORIZONTAL_ANCHOR.RIGHT,
    verticalAnchor : AR.CONST.VERTICAL_ANCHOR.TOP,
    onClick: Marker.prototype.getOnClickTrigger(this, true)
  };

  this.markerDrawable_idle = new AR.HtmlDrawable({html:img}, 5, options);

  options.click = null;
  this.markerDrawable_selected = new AR.HtmlDrawable({html:img}, 5, options);


  var dist = Math.round(this.poi.distance) / 1000;
  this.distanceLabel = new AR.Label(((dist > 9.9)? ' > 9.9 km ' : ' ' + dist.toFixed(2)) + ' km ', 0.45, {
    zOrder: 1,
    horizontalAnchor: AR.CONST.HORIZONTAL_ANCHOR.RIGHT,
    verticalAnchor : AR.CONST.VERTICAL_ANCHOR.TOP,
    opacity: 0.8,
    scale: 0.8,
    offsetX: -0.32,
    offsetY: -0.23,
    style: {
      textColor: '#444444',
      backgroundColor: "#FFFFFF",
      fontStyle: AR.CONST.FONT_STYLE.BOLD
    }
  });

  /*
  this.directionIndicatorDrawable = new AR.ImageDrawable(World.markerDrawable_directionIndicator, 0.1, {
    enabled: false,
    verticalAnchor: AR.CONST.VERTICAL_ANCHOR.TOP
  });
  */

  this.markerObject = new AR.GeoObject(this.poi.location, {
    drawables: {
      cam: [this.markerDrawable_idle, this.markerDrawable_selected, this.distanceLabel]
      //indicator: this.directionIndicatorDrawable
    }
  });

  return this;
}

function changeCameraState(isEnabled) {
  if(isEnabled) {
    AR.context.services.camera = true;
    document.location = 'architectsdk://actionButton?action=onResume';
  } else {
    AR.context.services.camera = false;
  }
}

function showIRView() {
  $("button.cont").hide();
  $(".title.cont").hide();
  $("button.ir").show();
  $(".title.ir").show();
  $('.container.overview .row.list').hide();
  $(".container.overview").hide();
}

function hideIRView() {
  $("button.ir").hide();
  $(".title.ir").hide();
  $("button.cont").show();
  $(".title.cont").show();
  $(".container.overview").show();
  $('.container.overview .row.list').show();
}

function openIRView() {
  //changeCameraState(true);
  showIRView();
  World.currentMode = 2;
  if(World.currentMarker) {
    var poi = World.currentMarker.poi;
    for(var i in World.RecognitionList) {
      if(World.RecognitionList[i].relation_id == poi.id && World.RecognitionList[i].relation_type == 1) {
        World.createIRPOI(World.RecognitionList[i]);
      }
    }
  }
}

function closeRecognitionView() {
  hideIRView();
  //changeCameraState(false);
  World.currentMode = 1;
  for(var i in World.ARchitectObjectList) {
    World.ARchitectObjectList[i].remove();
  }

  for(var i in World.TempLoadingList) {
    if(!World.TempLoadingList[i].destroyed) World.TempLoadingList[i].destroy();
  }
  World.TempLoadingList = [];

  World.ARchitectObjectList = [];
}

function closeOverView() {
  AR.context.services.sensors = true;
  World.sensorsActive = true;
  for(var n = 0; n < World.markerList.length; n++) {
    World.markerList[n].markerObject.enabled = true;
  }
  Marker.prototype.setDeselected(World.currentMarker);
  hideOverview();
  World.currentMode = 0;
  //changeCameraState(true);
  var l = World.currentLocation;
  World.locationChanged(l.latitude, l.longitude, l.altitude, l.accuracy);
}

function showOverview() {
  $(".container.overview").show();
  $('.container.overview .row.list').show();
  $('button.dropdown-toggle').hide();
  $('button.btn-title').hide();
  $("button.cont").show();
  $('.title.cont').show();
}

function hideOverview() {
  $('.title.cont').hide();
  $("button.cont").hide();
  $(".container.overview").hide();
  $('.container.overview .row.list').hide();
  $('button.dropdown-toggle').show();
  $('button.btn-title').show();
}

function closeSingleView() {
  //changeCameraState(true);

  World.SingleViewPages = [];
  $('.btn-next').hide();
  $('.btn-prev').hide();

  $('.row.singleView > div > .row').hide();
  $('button.sv').hide();
  $('.title.sv').hide();
  $('button.cont').show();
  $('.title.cont').show();
  $('.container.overview .row.singleView').hide();
  $('.container.overview .row.list').show();
}

function showSingleView() {
  //changeCameraState(false);
  $("button.cont").hide();
  $(".title.cont").hide();
  $("button.sv").show();
  $(".title.sv").show();
  $('.container.overview .row.list').hide();
  $('.container.overview .row.singleView').show();
}

function openSingleView(id) {
  var isAddOn = false;
  var cont = getPoiContentByID(id);

  if(cont == null) {
    cont = getAddOnByID(id);
    isAddOn = true;
  }

  if(cont != null) {

    if(World.story_id > -1) {
      if(isAddOn) World.reportState(cont, 'addOnSeen');
      else World.reportState(cont, 'contentSeen');

      if(World.SingleViewPages.length == 0) {
        $('.btn-next').show();
        World.SingleViewPages = [cont.id].concat(getAddOnIDsByIDInNarrationList(cont.id));
      }

    } else {
      if(World.SingleViewPages.length == 0) {
        $('.btn-next').show();
        var cont_id = -1;
        if(isAddOn) {
          cont_id = cont.relation_id;
        } else {
          cont_id = cont.id;
        }
        World.SingleViewPages = [cont.id].concat(getAddOnIDsByParentIDAndLanguage(cont_id, World.language, true));
      }
    }

    buildSingleView(cont);
    showSingleView();
  } else {
    closeSingleView();
  }
}

function showNextSingeViewPage() {
  World.SingleViewPage++;
  if(World.SingleViewPage == World.SingleViewPages.length - 1) {
    $('.btn-next').hide();
  }
  if(World.SingleViewPage == 1) {
    $('.btn-prev').show();
  }
  var id = World.SingleViewPages[World.SingleViewPage];
  $('.row.singleView > div > .row').hide();
  openSingleView(id);
}

function showPrevSingeViewPage() {
  World.SingleViewPage--;
  if(World.SingleViewPage == World.SingleViewPages.length - 2) {
    $('.btn-next').show();
  }
  if(World.SingleViewPage == 0) {
    $('.btn-prev').hide();
  }
  var id = World.SingleViewPages[World.SingleViewPage];
  $('.row.singleView > div > .row').hide();
  openSingleView(id);
}

function buildSingleView(cont) {
  $('.title.sv').text(decodeURI(cont.title));
  $('.title.sv').show();
  
  if(cont.text.length > 0) {
    $('.row.singleView .row.text p').text(decodeURI(cont.text));
    $('.row.singleView .row.text').show();
  }

  // audio und Video Knopf verstecken
  if(cont.media_file != "") {

    switch(cont.media_mimetype) {
      case "audio/mp3":
        $("#audioBtn").data("mediasrc", cont.media_file);
        $(".row.singleView .row.audio").show();
        break;
      case "image/png":
        $('.row.singleView .row.img a').attr("href", World.local_url + cont.media_file);
        $('.row.singleView .row.img img').attr("src", World.local_url + cont.media_file);
        $('.row.singleView .row.img img').one('error', function() { 
          this.src = World.server_url + cont.media_file;
          this.setAttribute('href', this.src);
        });
        $('.row.singleView .row.img').show();
        break;
      case "video/mp4":
        $("#videoBtn").data("mediasrc", cont.media_file);
        $(".row.singleView .row.video").show();
        break;
    }
  }

  if(World.SingleViewPages.length > 1) {
    $('.row.paging').show();
  } else {
    $('.row.paging').hide();
  }
}

function showShortDescriptionFooter(marker) {
  $("#footer .title").text(decodeURI(marker.poi.title));
  $("#footer .text").text(decodeURI(marker.poi.short_text));
  $("#footer").height('25%');
  $("#footer").show();
}

Marker.prototype.getOnClickTrigger = function(marker, showShortDescription) {
  return function() {

    $('.navbarx-collapse.in').collapse('hide');

    if(!Marker.prototype.isAnyAnimationRunning(marker)) {
      if(marker.isSelected) {
        Marker.prototype.setDeselected(marker);
        $("#footer").hide();
      } else {
        for(var i = 0; i < World.markerList.length; i++) {
          if(World.markerList[i].isSelected == true){
            Marker.prototype.setDeselected(World.markerList[i]);
          }
        }

        Marker.prototype.setSelected(marker);

        if(showShortDescription) {
          showShortDescriptionFooter(marker);
        } else {
          buildOverview(marker);
        }
      }
    } else {
      AR.logger.debug('a animation is already running');
    }

    return true;
  };
};

function buildOverview(marker) {
  World.currentMode = 1;
  AR.context.services.sensors = false;
  World.sensorsActive = false;
  //changeCameraState(false);

  $("#footer").hide();

  // show POI icon on top of overview page
  $('.container.overview a.img').attr("href", World.local_url + marker.poi.icon_file);
  $('.container.overview img').attr("src", World.local_url + marker.poi.icon_file);  
  $('.container.overview img').one('error', function() { 
    this.src = World.server_url + marker.poi.icon_file;
    this.setAttribute('href', this.src);
  });

  $('.container.overview h3').text(marker.poi.title);

  $('.container.overview .list-group').html('');

  // check if POI has any POI-Recognitions in order to show the button to enter the IR-Mode
  for(var i in World.RecognitionList) {
    if(World.RecognitionList[i].relation_id == marker.poi.id && World.RecognitionList[i].relation_type == 1) {
      var startIRLabel = World.language == 'en'? 'Start image recognition':'Bilderkennung starten';
      var html = '<button type="button" onclick="openIRView();" class="list-group-item text-left text-info"><span class="glyphicon glyphicon-camera"></span> '+ startIRLabel +'</button>';
      $('.container.overview .list-group').append(html);
      break;
    }
  }

  World.SingleViewPage = 0;
  World.SingleViewPages = [];
  $('.btn-next').hide();
  $('.btn-prev').hide();

  // if there is an active narration, let the narration system decide which POI-Contents to show/highlight
  if(World.story_id > -1) {
    World.reportState(marker.poi, 'poiClicked', function() {
      var list = World.narration.list;

      for(var i in list) {
        var elem = null;
        
        if(list[i][1]) elem = getAddOnByID(list[i][0]);
        else elem = getPoiContentByID(list[i][0]);

        if(!(elem.media_file == "" && elem.text.length <= 0)) {
          var badge = list[i][2]? ' <span class="badge"><span class="glyphicon glyphicon-star" style="color: gold;"></span></span>' : '';
          var html = '<button type="button" onclick="openSingleView('+elem.id+');" class="list-group-item text-left">'+ decodeURI(elem.title) + badge +'</button>';
          $('.container.overview .list-group').append(html);
        }
      }
      showOverview();
    });
  } else {

    for(var i in World.ContentList) {
      var cont = World.ContentList[i];
      if(cont.relation_id == marker.poi.id && cont.relation_type == 1) {

        // search for an replacement add-on if language is not the same as the users language
        if(World.language != cont.language) {
          var alt = getAddOnByParentIDAndLanguage(cont.id, World.language, false);
          if(alt != null) {
            cont = alt;
          }
        }

        if(!(cont.media_file == "" && cont.text.length <= 0)) {
          var html = '<button type="button" onclick="openSingleView('+cont.id+');" class="list-group-item text-left">'+ decodeURI(cont.title) +'</button>';
          $('.container.overview .list-group').append(html);
        }
      }
    }

    showOverview();
  }
}

function getAddOnByParentIDAndLanguage(id, language, isExtension) {
  var obj = null;
  for(var j in World.ContentAddOnList) {
    if(id == World.ContentAddOnList[j].relation_id && World.ContentAddOnList[j].language == language && World.ContentAddOnList[j].add_on_type == (isExtension? 0 : 1)) {
      obj = World.ContentAddOnList[j];
      break;
    }
  }
  return obj;
}

function getAddOnIDsByParentIDAndLanguage(id, language, isExtension) {
  var list = [];
  for(var j in World.ContentAddOnList) {
    if(id == World.ContentAddOnList[j].relation_id && World.ContentAddOnList[j].language == language && World.ContentAddOnList[j].add_on_type == (isExtension? 0 : 1)) {
      list.push(World.ContentAddOnList[j].id);
    }
  }
  return list;
}

function getAddOnIDsByIDInNarrationList(id) {
  var list = [];
  for(var j in World.narration.list) {
    if(id == World.narration.list[j][0]) {
      list = World.narration.list[j][3];
      break;
    }
  }
  return list;
}

function getAddOnByID(id) {
  var obj = null;
  for(var j in World.ContentAddOnList) {
    if(id == World.ContentAddOnList[j].id) {
      obj = World.ContentAddOnList[j];
      break;
    }
  }
  return obj;
}

function getPoiContentByID(id) {
  var obj = null;
  for(var j in World.ContentList) {
    if(id == World.ContentList[j].id) {
      obj = World.ContentList[j];
      break;
    }
  }
  return obj;
}

Marker.prototype.setSelected = function(marker) {
  if(marker && World.currentMode == 0) {
    marker.isSelected = true;
    World.currentMarker = marker;

    if(marker.animationGroup_selected === null) {
      var idleDrawableResizeAnimation = new AR.PropertyAnimation(
        marker.markerDrawable_idle, 'scaling', null, 1.0, kMarker_AnimationDuration_Resize,
        new AR.EasingCurve(AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC, {
          amplitude: 2.0
        })
      );

      var selectedDrawableResizeAnimation = new AR.PropertyAnimation(
        marker.markerDrawable_selected, 'scaling', null, 1.0, kMarker_AnimationDuration_Resize,
        new AR.EasingCurve(AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC, {
          amplitude: 2.0
        })
      );

      var distanceLabelOffsetXAnimation = new AR.PropertyAnimation(
        marker.distanceLabel, 'offsetX', null, 0.14, kMarker_AnimationDuration_Resize,
        new AR.EasingCurve(AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC, {
          amplitude: 2.0
        })
      );

      var distanceLabelOffsetYAnimation = new AR.PropertyAnimation(
        marker.distanceLabel, 'offsetY', null, 0.04, kMarker_AnimationDuration_Resize,
        new AR.EasingCurve(AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC, {
          amplitude: 2.0
        })
      );

      marker.animationGroup_selected = new AR.AnimationGroup(
        AR.CONST.ANIMATION_GROUP_TYPE.PARALLEL, [idleDrawableResizeAnimation, selectedDrawableResizeAnimation, distanceLabelOffsetXAnimation, distanceLabelOffsetYAnimation]);
    }

    marker.markerDrawable_idle.onClick = null;
    marker.markerDrawable_selected.onClick = Marker.prototype.getOnClickTrigger(marker, true);
    marker.animationGroup_selected.start();
    marker.markerObject.renderingOrder = ++World.highestRenderingOrder;
  }
};

Marker.prototype.setDeselected = function(marker) {
  console.log('setDeselected');
  if(marker && World.currentMode == 0) {
    marker.isSelected = false;
    World.currentMarker = null;

    if(marker.animationGroup_idle === null) {
      var idleDrawableResizeAnimation = new AR.PropertyAnimation(
        marker.markerDrawable_idle, 'scaling', null, 0.8, kMarker_AnimationDuration_Resize,
        new AR.EasingCurve(AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC, {
          amplitude: 2.0
        })
      );
      
      var selectedDrawableResizeAnimation = new AR.PropertyAnimation(
        marker.markerDrawable_selected, 'scaling', null, 0.8, kMarker_AnimationDuration_Resize,
        new AR.EasingCurve(AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC, {
          amplitude: 2.0
        })
      );

      var distanceLabelOffsetXAnimation = new AR.PropertyAnimation(
        marker.distanceLabel, 'offsetX', null, -0.32, kMarker_AnimationDuration_Resize,
        new AR.EasingCurve(AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC, {
          amplitude: 2.0
        })
      );

      var distanceLabelOffsetYAnimation = new AR.PropertyAnimation(
        marker.distanceLabel, 'offsetY', null, -0.23, kMarker_AnimationDuration_Resize,
        new AR.EasingCurve(AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC, {
          amplitude: 2.0
        })
      );

      marker.animationGroup_idle = new AR.AnimationGroup(
        AR.CONST.ANIMATION_GROUP_TYPE.PARALLEL, [idleDrawableResizeAnimation, selectedDrawableResizeAnimation, distanceLabelOffsetXAnimation, distanceLabelOffsetYAnimation]);
    }

    marker.markerDrawable_idle.onClick = Marker.prototype.getOnClickTrigger(marker, true);
    marker.markerDrawable_selected.onClick = null;
    marker.animationGroup_idle.start();
    marker.markerObject.renderingOrder = 0;
  }
};

Marker.prototype.isAnyAnimationRunning = function(marker) {
  if (marker.animationGroup_idle === null || marker.animationGroup_selected === null) {
    return false;
  } else {
    if ((marker.animationGroup_idle.isRunning() === true) || (marker.animationGroup_selected.isRunning() === true)) {
      console.log('animation is running');
      return true;
    } else {
      return false;
    }
  }
};