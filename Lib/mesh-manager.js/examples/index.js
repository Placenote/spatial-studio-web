// Gloal variables
const hiResImgNames = []; // Overview img filenames
const hiResPositions = []; // Overview img camera positions
const hiResQuaternions = []; // Overview img camera rotations
const placenoteMesh = new MeshManager.PlacenoteMesh();

// Callback functions

var onKeyFrameUpdate = function(keyframeInfo, camera) {
  // Add cube at raycast point
  var point = placenoteMesh.getRaycastPoint();
  var geometry = new Three.BoxGeometry( 0.1, 0.1, 0.1);
  var material = new Three.MeshBasicMaterial( {color: 0x00AEEF} );
  var cube = new Three.Mesh( geometry, material );
  cube.position.set(point.x,point.y,point.z);
  cube.rotation.set(point.x,point.y,point.z); // Random rotation
  scene.add(cube);
  cubes.push(cube);
  
  // Update keyframe images
  keyframeInfo['keyframeNames'].forEach(function (index, i) {

    updateDOMImage(index,`keyframe_${i+1}`);
  });
  console.log('Updated keyframes!');
}

var onLoad = function(value) {
  //
  var selectedObject = scene.getObjectByName('PlacenoteMesh');
  if(selectedObject) scene.remove( selectedObject );
  scene.add(value);
}

var onError = function(error) {
  console.log(error);
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
  placenoteMesh.setDecimationLevels([1,5]);

  setCookie('usersapikey', document.getElementById('apikey').value, 5);

  placenoteMesh.setLogging(true);
  placenoteMesh.getMeshObject3D(
    document.getElementById('apikey').value,
    document.getElementById('mapid').value, 
    onLoad,
    onError);
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


document.addEventListener("DOMContentLoaded", function() {
  
  // load the API key cookie
  var apiKey = getCookie('usersapikey');
  if (apiKey != null)
  {
    // set the value of the api key input field to the api key in cookie
    document.getElementById("apikey").value = apiKey;

  }

  // end function
});





// Three js viewer init
//var width = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) - 100;
//var height = (window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight) - 100;

var width  = document.getElementById('screencontainer').clientWidth * 0.75;
var height = document.getElementById('screencontainer').clientHeight;

const cameraAspect = width/height;

var scene = new Three.Scene();
scene.background = new Three.Color (0x333333 );
var camera = new Three.PerspectiveCamera( 50, cameraAspect, 0.1, 1000);
camera.position.z = 15;
camera.position.y = 10;
camera.lookAt(new Three.Vector3(0,0,0));

scene.add(new Three.AxesHelper(0.5));

var renderer = new Three.WebGLRenderer();

renderer.setSize(width, height);

document.getElementById('threeViewer').appendChild(renderer.domElement);
var controls = new Three.OrbitControls(camera, renderer.domElement);
controls.enabled = true;
controls.maxDistance = 1500;
controls.minDistance = 0;
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

scene.add( new Three.AmbientLight());
var cubes = []
var geometry = new Three.BoxGeometry( 0.1, 0.1, 0.1);
var material = new Three.MeshBasicMaterial( {color: 0xFFF200} );
material.wireframe = true;
var cube = new Three.Mesh( geometry, material );
cubes.push(cube);
scene.add(cube);

// END Three js viewer init 
  

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
  }
  
}
addEventListener( 'dblclick', onDocumentMouseDown, false ); // Add click listener for raycasting

// THREE.js animate function
var animate = function() {
  cubes.forEach(function (cube) {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  });

  requestAnimationFrame( animate );
  controls.update();
  renderer.render( scene, camera );
}
animate();
