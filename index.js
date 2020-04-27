// Global variables
const hiResImgNames = []; // Overview img filenames
const hiResPositions = []; // Overview img camera positions
const hiResQuaternions = []; // Overview img camera rotations
const placenoteMesh = new MeshManager.PlacenoteMesh();

var loadedMeshApiKey = "empty";
var loadedMeshMapId = "empty";

var isCameraTopDown = false;
var isLabelVisible = true;
// Callback functions

var onKeyFrameUpdate = function(keyframeInfo, camera) {
  // Update keyframe images
  keyframeInfo['keyframeNames'].forEach(function (index, i) {

    updateDOMImage(index,`keyframe_${i+1}`);
  });
  console.log('Updated keyframes!');
}



var onLoad = function(value) {

  var selectedObject = scene.getObjectByName('PlacenoteMesh');
  if(selectedObject) scene.remove( selectedObject );

  var selectedCube = scene.getObjectByName('clickCube');
  if(selectedCube) scene.remove( selectedCube );

  scene.add(value);
  loadedMeshApiKey = document.getElementById('apikey').value;
  loadedMeshMapId = document.getElementById('mapid').value;

  closeModal();
}

var onError = function(error) {
  console.log(error);

  closeModal();

  linkModal.style.display = "block";
  var anchor = document.getElementById('shareheader');
  anchor.innerHTML = "Could not download the mesh. <br /> <br /> Check the API Key and Map ID and try again.";

  document.getElementById('sharelink').style.display = 'none';


}

// END Callback functions

// Placenote endpoint functions

var updateDOMImage = function(imgName, image_id) { // Update DOM element image from img name
  const Http = new XMLHttpRequest();
  const url = 'https://us-central1-placenote-sdk.cloudfunctions.net/getImgDownloadUrl';

  var apiKeyVal = document.getElementById('apikey').value;
  var mapIdVal = document.getElementById('mapid').value;
  Http.open("GET", url);
  Http.setRequestHeader('APIKEY', apiKeyVal);
  Http.setRequestHeader('placeid', mapIdVal);

  Http.setRequestHeader('imgname', imgName);

  Http.send();

  Http.onreadystatechange = (e) =>
  {
    if (Http.readyState == 4 && Http.status == 200)
    {
        const jsonRes = JSON.parse(Http.responseText);
        document.getElementById(image_id).src = jsonRes.url;
    }
  }
}

var getOverviewImages = function() { // Get overview img data
  const Http = new XMLHttpRequest();
  const url='https://us-central1-placenote-sdk.cloudfunctions.net/listOverviewImgs';
  Http.open("GET", url);

  var apiKeyVal = document.getElementById('apikey').value;
  var mapIdVal = document.getElementById('mapid').value;

  Http.setRequestHeader('APIKEY', apiKeyVal);
  Http.setRequestHeader('placeid', mapIdVal);

  Http.send();
  Http.onreadystatechange = (e) =>
  {
    if (Http.readyState == 4 && Http.status == 200)
    {
      if (Http.responseText[0] != 'E')
      {
        var jsonFormatted = JSON.parse(Http.responseText);
        jsonFormatted["hiResImgNames"].forEach(function (name, index) {
          hiResImgNames.push(name);
          updateDOMImage(name, `overview_${index+1}`);
        });
        jsonFormatted["hiResPoses"].forEach(function (pose) {
          hiResPositions.push(new Three.Vector3(pose.position.x, pose.position.y, pose.position.z));
          hiResQuaternions.push(new Three.Quaternion(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w));
        });
      }
    }
  }
}

// END Placenote endpoint functions

// Start button onclick function
function onClickStartMeshManagerBtn() {
  //getOverviewImages();
  //placenoteMesh.setDecimationLevels([1,5]);

  if (loadedMeshApiKey == document.getElementById('apikey').value && loadedMeshMapId == document.getElementById('mapid').value)
  {

    linkModal.style.display = "block";
    var anchor = document.getElementById('shareheader');
    anchor.innerHTML = "You're already viewing this mesh";

    document.getElementById('sharelink').style.display = 'none';

  }
  else {
    openModal();

    //var element = document.getElementById("startMeshManager");
    //element.classList.remove("example-1");

    setCookie('usersapikey', document.getElementById('apikey').value, 5);

    placenoteMesh.setLogging(true);
    placenoteMesh.getMeshObject3D(
      document.getElementById('apikey').value,
      document.getElementById('mapid').value,
      onLoad,
      onError);

  }


}

// Download button onclick function
function onClickDownloadMeshToFolderButton() {

  setCookie('usersapikey', document.getElementById('apikey').value, 5);

  placenoteMesh.setLogging(true);
  placenoteMesh.downloadMeshToFolder(
    document.getElementById('apikey').value,
    document.getElementById('mapid').value,
    onError);
}

// Cookie saving code

function setCookie(name,value,days) {
  var expires = "";
  if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}
function eraseCookie(name) {
  document.cookie = name+'=; Max-Age=-99999999;';
}

function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
  });
  return vars;
}

function getUrlParam(parameter, defaultvalue){
  var urlparameter = defaultvalue;
  if(window.location.href.indexOf(parameter) > -1){
      urlparameter = getUrlVars()[parameter];
      }

  return urlparameter;
}

document.addEventListener("DOMContentLoaded", function() {

  // load the API key cookie
    var apiKeyParam = getUrlParam('apikey','Empty');
    var mapIDParam = getUrlParam('placeid','Empty');

  if (apiKeyParam == 'Empty' || mapIDParam == 'Empty') {

    var apiKey = getCookie('usersapikey');
    if (apiKey != null)
    {
      // set the value of the api key input field to the api key in cookie
      document.getElementById("apikey").value = apiKey;

    }
  }
  else {
    document.getElementById("apikey").value = apiKeyParam;
    document.getElementById("mapid").value = mapIDParam;

    // highlight view mesh button
    //var element = document.getElementById("startMeshManager");
    //element.classList.add("example-1");

    onClickStartMeshManagerBtn();

  }
  // end function
});

// Modal Code

// Get the modal
var modal = document.getElementById("imageModal");

// When the user clicks the button, open the modal
function openModal() {
  modal.style.display = "block";
}

function closeModal() {
  modal.style.display = "none";
}


// Three js viewer init
//var width = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) - 100;
//var height = (window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight) - 100;

var width  = document.getElementById('screencontainer').clientWidth * 0.75;
var height = document.getElementById('screencontainer').clientHeight;

const cameraAspect = width/height;

var scene = new Three.Scene();
scene.background = new Three.Color (0x333333 );
var camera = new Three.PerspectiveCamera( 50, cameraAspect, 0.1, 1000);
//var camera = new Three.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );


camera.position.z = 15;
camera.position.y = 10;
//camera.lookAt(new Three.Vector3(0,0,0));

scene.add(new Three.AxesHelper(0.5));

var renderer = new Three.WebGLRenderer();

renderer.setSize(width, height);

labelRenderer = new Three.CSS2DRenderer();
labelRenderer.setSize( width, height );
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';

document.getElementById('threeViewer').appendChild(renderer.domElement);
document.getElementById('threeViewer').appendChild(labelRenderer.domElement);
var controls = new Three.OrbitControls(camera, renderer.domElement);
controls.enabled = true;
controls.maxDistance = 10;
controls.minDistance = 2;
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI/2;

scene.add( new Three.AmbientLight());
var markers = [];
var labelIndex = -1;

// END Three js viewer init

function onToggleCameraButtonClick() {
  var middle = placenoteMesh._setCameraOrbitOnCenter();
  if (isCameraTopDown == false) {
    isCameraTopDown = true;
    camera.position.set(middle.x,10,middle.z);
    placenoteMesh._setCameraOrbitOnCenter();
    controls.enableRotate = false;
    controls.enablePan = true;
  }
  else {
    isCameraTopDown = false;
    camera.position.set(0,10,15);
    controls.enableRotate = true;
    controls.enablePan = false;
  }
  controls.update();
}
function onToggleLabelViewButtonClick() {
  if (isLabelVisible) {
    scene.children.forEach((child) => {
      if (child.className =='noteMarker' && child.children[1]) {
        child.remove(child.children[1]);
      }
    });
    isLabelVisible= false;
  }
  else {
    scene.children.forEach((child) => {
      if (child.className == 'noteMarker') {
        var text = document.createElement( 'div' );
        text.className = 'noteText';
        text.textContent = child.name;
        text.style.zIndex = '-9999';
        var label = new Three.CSS2DObject( text );
        label.name = "Label: " + child.name;
        child.add( label );
      }
    });
    isLabelVisible = true;
  }
}

var linkModal = document.getElementById("linkmodal");
var span = document.getElementsByClassName("close")[0];


// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  linkModal.style.display = "none";
}


// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == linkModal) {
    linkModal.style.display = "none";
  }
}


function onShareLinkButtonClick()
{
  linkModal.style.display="block";
  if (loadedMeshApiKey != "empty" || loadedMeshMapId != "empty")
  {

    document.getElementById('shareheader').innerHTML = "Copy and share this link";
    var anchor = document.getElementById('sharelink');
    anchor.style.display = 'block';
    anchor.value = window.location.href
                        + "?apikey="
                        + loadedMeshApiKey + "&placeid=" + loadedMeshMapId;
  }
  else {

    var anchor = document.getElementById('shareheader');
    anchor.innerHTML = "You need to click \"View Mesh\" to before you can share a mesh";

    document.getElementById('sharelink').style.display = 'none';
  }
}

function onNextNoteButtonClick() {
  ++labelIndex; // increments index
  if (labelIndex == placenoteMesh.NotesArray.length) {
    labelIndex = 0; // If the end of array is reached, reset to first array entry
  }
  // Update the target for OrbitControls and moves camera closer to note
  var cameraVector = new Three.Vector3(controls.object.position.x, controls.object.position.y, controls.object.position.z);
  var noteVector = new Three.Vector3(placenoteMesh.NotesArray[labelIndex].px,placenoteMesh.NotesArray[labelIndex].py,placenoteMesh.NotesArray[labelIndex].pz);
  controls.target.set(noteVector.x,noteVector.y,noteVector.z); // Sets camera to orbit around note
  var distance = cameraVector.distanceTo(noteVector) - 2.5;
  camera.translateZ(-distance);
  controls.update();
}

function onPrevNoteButtonClick() {
  if (labelIndex <= 0) {
    labelIndex = placenoteMesh.NotesArray.length - 1;  // If previous button is clicked first, go to last entry
  }
  else {
    --labelIndex; // decrements index
  }
  // Update the target for OrbitControls and moves camera closer to note
  var cameraVector = new Three.Vector3(controls.object.position.x, controls.object.position.y, controls.object.position.z);
  var noteVector = new Three.Vector3(placenoteMesh.NotesArray[labelIndex].px,placenoteMesh.NotesArray[labelIndex].py,placenoteMesh.NotesArray[labelIndex].pz);
  controls.target.set(noteVector.x,noteVector.y,noteVector.z); // Sets camera to orbit around note
  var distance = cameraVector.distanceTo(noteVector) - 2.5;
  camera.translateZ(-distance);
  controls.update();
}

function onCalibrateButtonClick() {
  placenoteMesh._setCameraOrbitOnCenter();
  labelIndex = -1;
}

function onNotesViewButtonClick() {
  var noteOptions = {};
  var noteIndex = 0;
  placenoteMesh.NotesArray.forEach(function(noteObj) {
    noteOptions[noteIndex] = noteObj.noteText;
    ++noteIndex;
  })
    Swal.fire({
      title: 'Select a Note!',
      html: "Jump to the selected note by pressing 'OK'",
      input:'select',
      inputPlaceholder: 'Pick a note',
      inputOptions: noteOptions,
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (value === "") { resolve(); } // If no note is selected but OK is still pressed
          labelIndex = value;
          // Update the target for OrbitControls and moves camera closer to note
          var cameraVector = new Three.Vector3(controls.object.position.x, controls.object.position.y, controls.object.position.z);
          var noteVector = new Three.Vector3(placenoteMesh.NotesArray[value].px,placenoteMesh.NotesArray[value].py,placenoteMesh.NotesArray[value].pz);
          controls.target.set(noteVector.x,noteVector.y,noteVector.z); // Sets camera to orbit around note
          var distance = cameraVector.distanceTo(noteVector) - 2.5;
          camera.translateZ(-distance);
          controls.update();
          resolve();
        })
      }
    });
}

class MapMetadataSettable {
  constructor(name, location, userdata) {
    this.name = name;
    this.location = location;
    this.userdata = userdata;
  }
}

class MapLocation {
  constructor(latitude, longitude, altitude) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.altitude = altitude;
  }
}

class NoteInfo {
  constructor(px, py, pz, noteText) {
    this.px = px;
    this.py = py;
    this.pz = pz;
    this.noteText = noteText;
  }
}

var onDocumentMouseDown = function(event) {
  if(!placenoteMesh.isInitialized()) return;

  // Ensure the click is using these coordinates:
  // normalized device coordinates (NDC)---X and Y components should be between -1 and 1.
  // where bottom left is (-1,-1) and top right is (1,1)
  var rect = event.target.getBoundingClientRect(),
    offsetX = event.clientX - rect.left,
    offsetY = event.clientY - rect.top;

  if (event.srcElement.id.split('_')[0] === 'overview') {
    const overviewImgNum = event.srcElement.id.split('_')[1] - 1;
    const x =  ( offsetX / (event.target.clientHeight) ) * 2 - 1;
    const y = - ( offsetY / (event.target.clientWidth) ) * 2 + 1;

    const clickPoint2D = new Three.Vector2(x,y);
    placenoteMesh.clicketyClick(clickPoint2D, scene, hiResPositions[overviewImgNum], hiResQuaternions[overviewImgNum], 0, true, onKeyFrameUpdate, onError, 5)
  } else if (event.srcElement.parentNode.id === 'threeViewer'){
    const x =  ( offsetX / (event.target.clientWidth) ) * 2 - 1;
    const y = - ( offsetY / (event.target.clientHeight) ) * 2 + 1;

    const clickPoint2D = new Three.Vector2(x,y);
    placenoteMesh.clicketyClick(clickPoint2D, scene, camera.position, camera.quaternion, cameraAspect, false, onKeyFrameUpdate, onError, 5)

    // show image panels

    document.getElementById('gridcontainer').style.display='block';

  }

}
addEventListener( 'dblclick', onDocumentMouseDown, false ); // Add click listener for raycasting

// THREE.js animate function
var animate = function() {
  markers.forEach(function (marker) {
    marker.rotation.y += 0.01;
  });

  requestAnimationFrame( animate );
  controls.update();
  renderer.render( scene, camera );
  labelRenderer.render( scene, camera );
}
animate();

