var MeshManager = (function (exports, JSZip, JSZipUtils, threeFull) {
  'use strict';

  JSZip = JSZip && JSZip.hasOwnProperty('default') ? JSZip['default'] : JSZip;
  JSZipUtils = JSZipUtils && JSZipUtils.hasOwnProperty('default') ? JSZipUtils['default'] : JSZipUtils;

  var PlacenoteMesh = function () {
    function PlacenoteMesh() {
      this.apiKey = '';
      this.mapId = '';
      this.decimationLevels = [1, 5, 100]; // Default download three different levels of decimated meshse 

      this.initialized = false;
      this.ptCameras = []; // Camera 

      this.keyframeNames = []; // Names of each keyframe assocaited with each ptCamera.

      this.bestKeyframeIndex = 0;
      this.raycaster = new threeFull.Raycaster();
      this.readyForRaycast = true;
      this.lastRaycastPoint;
      this.logging = false;
      this.meshMetadata = null;
    }
    /**
     * @desc HELPER METHOD: Retrieves mesh metadata. 
     * Makes Http request to get metadata
     */  
    PlacenoteMesh.prototype._getMeshMetadata = function () {
      const Http = new XMLHttpRequest();
      const url = 'https://us-central1-placenote-sdk.cloudfunctions.net/getMetadata';
      var apiKeyVal = document.getElementById('apikey').value;
      var mapIdVal = document.getElementById('mapid').value;
      Http.open("GET", url, true);
      Http.setRequestHeader('APIKEY', apiKeyVal);
      Http.setRequestHeader('placeid', mapIdVal);
      Http.send();
      Http.onreadystatechange = (e) => {
      const jsonRes = JSON.parse(Http.response);
      this.meshMetadata = jsonRes;
      if (jsonRes.metadata.userdata) { 
        NotesArray = jsonRes.metadata.userdata.notesList;
      }
      NotesArray.forEach((noteObj) => {
        // Loads cubes into the scene
        var geometry = new Three.BoxGeometry( 0.1, 0.1, 0.1);
        var material = new Three.MeshBasicMaterial( {color: 0x00AEEF} );

        var newCube = new Three.Mesh( geometry, material );
        newCube.name = "noteCube";
        newCube.userData = noteObj.note;
        scene.add(newCube);
        cubes.push(newCube);
        newCube.position.set(noteObj.note.px,noteObj.note.py,noteObj.note.pz);
      })
      return this.meshMetadata;
      }
    };

     /**
    * @desc HELPER METHOD: Sets mesh metadata. 
    * Makes Http request to set metadata
    */
   PlacenoteMesh.prototype._setMeshMetadata = function (data) {
    const Http = new XMLHttpRequest();
    const url = 'https://us-central1-placenote-sdk.cloudfunctions.net/setMetadata';
    var apiKeyVal = document.getElementById('apikey').value;
    var mapIdVal = document.getElementById('mapid').value;
    Http.open("POST", url, true);
    Http.setRequestHeader('APIKEY', apiKeyVal);
    Http.setRequestHeader('placeid', mapIdVal);

    Http.send(JSON.stringify(data));

    Http.onreadystatechange = (e) => {
      if (Http.readyState == 4 && Http.status == 200) {
        this.meshMetadata = data;
        Swal.fire({
          icon: 'success',
          text: "'Note info has been saved'",
        });
      }
      if (Http.status == 400) {
        Swal.fire({
          icon: 'error',
          text: "'Oops...', 'Something went wrong!', 'error'",
        });
      }
    }
   }
    /**
    * @desc HELPER METHOD: initializes mesh for clickety click. 
    * Makes Http request to download dataset.json
    * Calls _createClicketyClickCameras()
    * @param onError (Optional) Error callback that receives the error as an argument
    */
    PlacenoteMesh.prototype._init = function (onError) {
      if (this.logging) console.log('Starting Initialization');
      this._getMeshMetadata();
      var scope = this;
      var xhr = new XMLHttpRequest(); // Get URL for dataset.json

      var url = 'https://us-central1-placenote-sdk.cloudfunctions.net/getDatasetFileDownloadUrl';
      xhr.open('GET', url);
      xhr.setRequestHeader('APIKEY', this.apiKey);
      xhr.setRequestHeader('placeid', this.mapId);
      xhr.setRequestHeader('filename', 'dataset.json');

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
          var _url = JSON.parse(xhr.responseText).url;
          var xhrDownload = new XMLHttpRequest(); // Download dataset.json

          xhrDownload.overrideMimeType('application/json');
          xhrDownload.open('GET', _url, true);

          xhrDownload.onreadystatechange = function () {
            if (xhrDownload.readyState == 4 && xhrDownload.status == '200') {
              var datasetJson = JSON.parse(xhrDownload.responseText);

              for (var item in datasetJson) {
                // Remove localization points from dataset.json
                datasetJson[item].points = [];
              }

              var onComplete = function onComplete() {
                if (scope.logging) console.log('Initialization complete');
                scope.initialized = true;
              };

              scope._createClicketyClickCameras(datasetJson, onComplete, onError);
            }
          };

          xhrDownload.send();
        } else if (xhr.status == 403) {
          if (onError) onError('Mesh Manager Error: Could not get dataset.json with response ', xhr.responseText);
          return;
        }
      };

      xhr.send();
    };
    /**
    * @desc PUBLIC METHOD: Load a mesh
    * Calls _downloadMesh()
    * Calls _init()
    * @param apikey Placenote API key
    * @param mapid Placenote map id/ place id
    * @param onLoad Callback when mesh is loaded. Receives Object3D as argument. Is called once per decimation level
    * @param onError (Optional) Error callback that receives the error as an argument.
    * @param decimated (Optional) false: downloads single highest resolution mesh. true: downloads multiple decimations of mesh.
    */


    PlacenoteMesh.prototype.getMeshObject3D = function (apiKey, mapId, onLoad, onError) {
      var decimated = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;
      this.apiKey = apiKey;
      this.mapId = mapId;
      if (decimated === false) this.decimationLevels = [100]; // Set to max resolution if decimation is false

      for (var i = 0; i < this.decimationLevels.length; i++) {
        this._downloadMesh(this.decimationLevels[i], onLoad, onError);
      }

      if (!this.initialized) this._init(onError);
    };
    /**
    * @desc PUBLIC METHOD: Directly download a mesh
    * Calls _downloadMesh()
    * Calls _init()
    * @param apikey Placenote API key
    * @param mapid Placenote map id/ place id
    * @param onLoad Callback when mesh is loaded. Receives Object3D as argument. Is called once per decimation level
    * @param onError (Optional) Error callback that receives the error as an argument.
    * @param decimated (Optional) false: downloads single highest resolution mesh. true: downloads multiple decimations of mesh.
    */


    PlacenoteMesh.prototype.downloadMeshToFolder = function (apiKey, mapId, onError) {
      this.apiKey = apiKey;
      this.mapId = mapId; //this.decimationLevels = [100]; // Set to max resolution if decimation is false

      var xhr = new XMLHttpRequest();
      var url = 'https://us-central1-placenote-sdk.cloudfunctions.net/getMeshDownloadUrl';
      xhr.open('GET', url);
      xhr.setRequestHeader('APIKEY', this.apiKey);
      xhr.setRequestHeader('placeid', this.mapId);

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
          var _url2 = JSON.parse(xhr.responseText).url;
          console.log('The Mesh Download URL is :: ' + _url2);
          window.location.href = _url2;

          var datasetId = _url2.split('mesh%2F')[1].split('_mesh')[0]; // Extract datasetId from url


          console.log('The dataset id is :: ' + datasetId);
        } else if (xhr.status == 403) {
          if (onError) onError('Mesh Manager Error: Could not download mesh with response ', xhr.responseText);
          return;
        }
      };

      xhr.send();
    };
    /**
    * @desc PUBLIC METHOD: Get names of keyframeimages from 2D click point.
    * @param clickPoint2D THREE.Vector2 of click point on element
    * in normalized device coordinates (NDC)---X and Y components should be between -1 and 1. Bottom left is (-1,-1) and top right is (1,1)
    * @param scene Reference to current THREE.js scene in use
    * @param cameraPosition THREE.Vector3: position of the overview camera or THREE.js viewer camera.
    * @param cameraRotation THREE.Quaternion: quaternion of the overview camera or THREE.js viewer camera.
    * @param cameraAspect (Optional if image isOverview) Aspect ratio of camera used for THREE.js viewer.
    * @param isOverview Bool if click is coming from overview image not mesh click.
    * @param onKeyframeUpdate Callback that receives object that includes array of keyframe names and theBestKeyframeIndex as an argument.
    * @param onError (Optional) Error callback that receives the error as an argument.
    * @param keyframeAmount (Optional) The amount of keyframes to return.
    * @return 
    */


    PlacenoteMesh.prototype.clicketyClick = function (clickPoint2D, scene, cameraPosition, cameraQuaternion, cameraAspect, isOverview, onKeyframeUpdate, onError) {
      var keyframeAmount = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : 3;

      if (!this.initialized) {
        if (onError) onError('ClicketyClick not initialized yet');
        return;
      }

      if (isOverview) {
        // Set aspect ratio for overview images
        cameraAspect = 1920 / 1440;
      }

      var rayStart = new threeFull.Vector2(clickPoint2D.x, clickPoint2D.y);
      var clickCamera = new threeFull.PerspectiveCamera(50, cameraAspect, 0.1, 20);
      clickCamera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
      clickCamera.quaternion.set(cameraQuaternion.x, cameraQuaternion.y, cameraQuaternion.z, cameraQuaternion.w);
      var manualMatrixWorld = new threeFull.Matrix4();

      if (isOverview) {
        // Update camera pose to THREE.js coords
        if (this.logging) console.log('Clickpoint overview received');

        var transformedCamera = this._poseToThreeJS(clickCamera);

        clickCamera.position.set(transformedCamera.position.x, transformedCamera.position.y, transformedCamera.position.z);
        clickCamera.quaternion.set(transformedCamera.quaternion.x, transformedCamera.quaternion.y, transformedCamera.quaternion.z, transformedCamera.quaternion.w);
        manualMatrixWorld.compose(transformedCamera.position, transformedCamera.quaternion, new threeFull.Vector3(1, 1, 1));
        clickCamera.matrixWorld = manualMatrixWorld;
        rayStart.x = clickPoint2D.y; // Flip coordinates of overview image

        rayStart.y = -clickPoint2D.x;
      } else {
        // Update camera pose to THREE.js coords
        if (this.logging) console.log('Clickpoint mesh received');
        manualMatrixWorld.compose(cameraPosition, cameraQuaternion, new threeFull.Vector3(1, 1, 1));
        clickCamera.matrixWorld = manualMatrixWorld;
      }

      this.raycaster = new threeFull.Raycaster();
      this.raycaster.setFromCamera(rayStart, clickCamera);
      var intersects = this.raycaster.intersectObjects(scene.children, true);
      var scope = this;

      for (var i = 0; i < intersects.length; i++) {
        if (scope.readyForRaycast && (intersects[i].object.name == 'PlacenoteMesh' || intersects[i].object.name == 'noteCube')) {
          var noteObj = intersects[i].object;
          delete this.meshMetadata.metadata.created; // Removes parameter so valid metadata is passed
          let meshMetadata = this.meshMetadata;
          var deleteButton = document.createElement('button');
            // Logic for "Delete Button" when a note is clicked
            deleteButton.addEventListener('click', function(){
              // Removes Edit, Delete, and Edit-Save buttons when a note is deleted
              var elements = document.getElementsByClassName("noteModifiers");
              while(elements.length > 0){
                elements[0].parentNode.removeChild(elements[0]);
              }
              // Modifies notes list by removing the note being deleted from the array
              NotesArray.forEach((note) => {
                if (note.note.noteText == noteObj.userData.noteText) {
                  let index = meshMetadata.metadata.userdata.notesList.indexOf(note);
                  meshMetadata.metadata.userdata.notesList.splice(index, 1);
                  meshMetadata.metadata.userdata.notesList = NotesArray;
                  scope._setMeshMetadata(meshMetadata);
                }
              })
              // Removes all notes from the scene 
              while (scene.getObjectByName("noteCube")) {
                scene.remove(scene.getObjectByName("noteCube"));
              }
              // Adds all notes to the scene using the modified metadata
              meshMetadata.metadata.userdata.notesList.forEach((noteObj) => {
                var geometry = new Three.BoxGeometry( 0.1, 0.1, 0.1);
                var material = new Three.MeshBasicMaterial( {color: 0x00AEEF} );
                var newCube = new Three.Mesh( geometry, material );
                newCube.name = "noteCube";
                newCube.userData = noteObj.note;
                newCube.position.set(noteObj.note.px,noteObj.note.py,noteObj.note.pz);
                scene.add(newCube);
              })
            })
            deleteButton.innerHTML = "Delete Note";
            deleteButton.className = "noteModifiers";
          var buttons = document.createElement('div');
          buttons.appendChild(deleteButton);
         
          // Logic if raycast hits an existing object
          if (intersects[i].object.name == 'noteCube') {
            // Modal to enter note text
            Swal.fire({
              title: 'Edit Note!',
              text: 'Enter note text here:',
              input: 'text',
              showCancelButton: true,
              cancelButtonText: "Cancel",
              confirmButtonText: "Save note info",
              inputValue: noteObj.userData.noteText,
              allowOutsideClick: false,
              inputValidator: (noteText) => {
                if(!noteText){
                    return 'You need to enter text!';       
                }
                if( noteText.length > 100 ){
                    return 'You have exceeded 100 characters';
                }
              },
              preConfirm: function(noteText) {
                Swal.showLoading();
                NotesArray.forEach((note) => {
                  if (note.note.noteText == noteObj.userData.noteText) {
                    note.note.noteText = noteText;
                    noteObj.userData.noteText = noteText;
                  }
                })
                meshMetadata.metadata.userdata.notesList = NotesArray;
                scope._setMeshMetadata(meshMetadata);
              }
            });
            document.getElementById("noteManager").appendChild(deleteButton);
            intersects[i].object.material = new Three.MeshBasicMaterial( {color: 0xFF0000} ); // Changes color of object when clicked on
          }
          // Logic if raycast hits the mesh
          if (intersects[i].object.name == 'PlacenoteMesh') {
             // Modal to enter note text
             Swal.fire({
              title: 'Create a Note!',
              text: 'Enter note text here:',
              input: 'text',
              showCancelButton: true,
              cancelButtonText: "Cancel",
              confirmButtonText: "Save note info",
              allowOutsideClick: false,
              inputValue: noteObj.userData.noteText,
              inputValidator: (noteText) => {
                if(!noteText){
                    return 'You need to enter text!';       
                }
                if( noteText.length > 25 ){
                    return 'You have exceeded 25 characters';
                }
              },
              preConfirm: function(noteText) {
                Swal.showLoading();
                var point = scope.getRaycastPoint();
                var noteInfo = new NoteInfo(point.x, point.y, point.z, noteText);
                const location = new MapLocation(0,0,0);
  
                NotesArray.push({note: noteInfo});
                let notesList = {notesList: NotesArray};
                let data = new MapMetadataSettable("Processed Mesh", location, notesList);
                scope._setMeshMetadata({metadata: data});

                // Add cube at raycast point
                var geometry = new Three.BoxGeometry( 0.1, 0.1, 0.1);
                var material = new Three.MeshBasicMaterial( {color: 0x00AEEF} );

                var newCube = new Three.Mesh( geometry, material );
                newCube.name = "noteCube";
                newCube.userData = noteInfo;
                scene.add(newCube);
                cubes.push(newCube);
                newCube.position.set(point.x, point.y, point.z);
              }
            });
          }
          // Take first intersection with mesh
          if (scope.logging) console.log('Raycast to mesh is true');
          scope.readyForRaycast = false;
          scope.lastRaycastPoint = intersects[i].point;

          this._getKeyframeIndexFromPoint(scope.lastRaycastPoint, onKeyframeUpdate, onError, keyframeAmount);
        }
      }

      this.readyForRaycast = true;
    };
    /**
    * @desc PUBLIC METHOD: Get point of last raycast intersection.
    * @return THREE.Vector3 of raycast intersection point
    */

    PlacenoteMesh.prototype.getRaycastPoint = function () {
      if (this.lastRaycastPoint) return this.lastRaycastPoint;
      return new threeFull.Vector3(1, 1, 1);
    };
    /**
    * @desc PUBLIC METHOD: get initialization status
    * @return Bool of initialization status
    */


    PlacenoteMesh.prototype.isInitialized = function () {
      return this.initialized;
    };
    /**
    * @desc PUBLIC METHOD: set decimation level of mesh to download
    * @param newDecimationLevels
    * @param onError (Optional) Error callback that receives the error as an argument.
    */


    PlacenoteMesh.prototype.setDecimationLevels = function (newDecimationLevels, onError) {
      if (Array.isArray(newDecimationLevels)) {
        this.decimationLevels = newDecimationLevels;
      } else {
        onError('Mesh Manager Error: Decimation Levels must be an array');
      }
    };
    /**
    * @desc PUBLIC METHOD: set bool for console logging
    * @param logging
    */


    PlacenoteMesh.prototype.setLogging = function (logging) {
      this.logging = logging;
    };
    /**
    * @desc HELPER METHOD: 
    * Calls onKeyframeUpdate()
    * @param point THREE.Vector3: raycasted point on mesh
    * @param onKeyframeUpdate Callback that receives object that includes array of keyframe names and theBestKeyframeIndex as an argument.
    * @param onError (Optional) Error callback that receives the error as an argument.
    * @param keyframeAmount The amount of keyframes to return.
    */


    PlacenoteMesh.prototype._getKeyframeIndexFromPoint = function (point, onKeyframeUpdate, onError, keyframeAmount) {
      var scope = this;
      var shortestDistance = Number.MAX_VALUE;
      var shortestIndex = -1;
      this.ptCameras.forEach(function (viewPortCam, index) {
        //check if point is within camera's view:
        viewPortCam.updateMatrix(); // make sure camera's local matrix is updated

        viewPortCam.updateMatrixWorld(); // make sure camera's world matrix is updated

        viewPortCam.matrixWorldInverse.getInverse(viewPortCam.matrixWorld);
        var frustum = new threeFull.Frustum();
        frustum.setFromMatrix(new threeFull.Matrix4().multiplyMatrices(viewPortCam.projectionMatrix, viewPortCam.matrixWorldInverse));

        if (frustum.containsPoint(point)) {
          var distance = scope.ptCameras[index].position.distanceToSquared(point);

          if (distance < shortestDistance) {
            shortestDistance = distance;
            shortestIndex = index;
          }
        }
      });
      var keyframeInfo = {}; // Create object for onKeyframeUpdate callback

      keyframeInfo['keyframeNames'] = [];
      keyframeInfo['bestKeyframeIndex'] = Math.round(keyframeAmount / 2) - 1;

      for (var i = -Math.round(keyframeAmount / 2 - 1); i < Math.round(keyframeAmount / 2); i++) {
        keyframeInfo['keyframeNames'].push(this.keyframeNames[shortestIndex + i]);
      }

      onKeyframeUpdate(keyframeInfo);
    };
    /**
    * @desc HELPER METHOD: Gets mesh url from Placenote endpoint
    * calls _unZip()
    * @param decimationLevel integer to set percentreduction header to.
    * @param onLoad Callback when mesh is loaded. Receives Object3D as argument.
    * @param onError (Optional) Error callback that receives the error as an argument
    */


    PlacenoteMesh.prototype._downloadMesh = function (decimationLevel, onLoad, onError) {
      var _this = this;

      var xhr = new XMLHttpRequest();
      var url = 'https://us-central1-placenote-sdk.cloudfunctions.net/getMeshDownloadUrl';
      xhr.open('GET', url);
      xhr.setRequestHeader('APIKEY', this.apiKey);
      xhr.setRequestHeader('placeid', this.mapId);

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
          var _url3 = JSON.parse(xhr.responseText).url;

          var datasetId = _url3.split('mesh%2F')[1].split('_mesh')[0]; // Extract datasetId from url


          console.log('URL = ' + _url3);
          console.log('Dataset ID = ' + datasetId);

          _this._unZip(_url3, datasetId, onLoad, onError);
        } else if (xhr.status == 403) {
          if (onError) onError('Mesh Manager Error: Could not download mesh with response ', xhr.responseText);
          return;
        }
      };

      xhr.send();
    };
    /**
    * @desc HELPER METHOD: Downloads mesh from url, and unzips it
    * calls _generateMesh()
    * @param url Signed url to download mesh from Placenote server
    * @param datasetId id of dataset. Used to navigate downloaded zip
    * @param onLoad Callback when mesh is loaded. Receives Object3D as argument.
    * @param onError (Optional) Error callback that receives the error as an argument
    */


    PlacenoteMesh.prototype._unZip = function (url, datasetId, onLoad, onError) {
      var scope = this;
      JSZipUtils.getBinaryContent(url, function (err, data) {
        if (err) {
          if (onError) onError(err);
        }

        if (scope.logging) console.log('Mesh download complete');
        JSZip.loadAsync(data, {
          createFolders: true
        }).then(function (zip) {
          var fileNameObj = "tmp/".concat(datasetId, "/dataset_mesh_texture.obj");
          var fileNameTex = "tmp/".concat(datasetId, "/dataset_mesh_texture_material_0_map_Kd.jpg");
          zip.files[fileNameObj].async('blob').then(function (fileDataObj) {
            // Read the obj file
            var objFile = new File([fileDataObj], fileNameObj);
            var readerObj = new FileReader();
            readerObj.addEventListener('load', function () {
              zip.files[fileNameTex].async('blob').then(function (fileDataTex) {
                // Read the texture file
                var texFile = new File([fileDataTex], fileNameTex);
                var readerTex = new FileReader();
                readerTex.addEventListener('load', function () {
                  scope._generateMesh(readerObj.result, readerTex.result, onLoad, onError);
                }, false);

                if (texFile) {
                  readerTex.readAsDataURL(texFile);
                } else {
                  if (onError) onError('Mesh Manager Error: cannot read texture after unzip');
                }
              });
            }, false);

            if (objFile) {
              readerObj.readAsDataURL(objFile);
            } else {
              if (onError) onError('Mesh Manager Error: cannot read obj after unzip');
            }
          });
        });
      });
    };
    /**
    * @desc HELPER METHOD: Loads obj and texture into Object3D
    * Calls onLoad callback
    * @param pathToMesh Path or url to obj file of mesh
    * @param pathToTexture Path or url to texture file of mesh
    * @param onLoad Callback when mesh is loaded. Receives Object3D as argument.
    * @param onError (Optional) Error callback that receives the error as an argument
    */


    PlacenoteMesh.prototype._generateMesh = function (pathToMesh, pathToTexture, onLoad, onError) {
      var scope = this;

      var onLoadTexture = function onLoadTexture(texture) {
        var materials = {};
        materials['material_0'] = new threeFull.MeshBasicMaterial({
          map: texture
        });
        objLoader.setMaterials(materials);
        objLoader.setLogging(false, false);
        if (scope.logging) console.log('Loading mesh');
        objLoader.load(pathToMesh, onLoadObj, null, onError, null, true);
      };

      var onLoadObj = function onLoadObj(event) {
        var mesh = event.detail.loaderRootNode.children[0];
        mesh.quaternion.set(0, 0, 1, 0); // Rotate mesh from Placenote coords to Three js coords

        mesh.name = 'PlacenoteMesh';
        if (scope.logging) console.log('Loading mesh complete');
        onLoad(mesh);
      };

      var objLoader = new threeFull.OBJLoader2();
      var textureLoader = new threeFull.TextureLoader();
      textureLoader.load(pathToTexture, onLoadTexture, null, onError);
    };
    /**
    * @desc HELPER METHOD: Creates cameras for each dataset.json pose
    * @param datasetJson
    * @param onComplete (Optional) Callback when camera creation is done
    * @param onError (Optional) Error callback
    */


    PlacenoteMesh.prototype._createClicketyClickCameras = function (datasetJson, onComplete, onError) {
      if (datasetJson.length === 0) {
        if (onError) onError('Mesh Manager error: No dataset json was found.');
        return;
      }

      var scope = this;
      datasetJson.forEach(function (datasetItem) {
        var placenoteCamera = new threeFull.PerspectiveCamera(50, 640 / 360, 0.1, 4); // Create camera based on dataset pose

        placenoteCamera.position.set(datasetItem['mapPose'].position.x, datasetItem['mapPose'].position.y, datasetItem['mapPose'].position.z);
        placenoteCamera.quaternion.set(datasetItem['mapPose'].rotation.x, datasetItem['mapPose'].rotation.y, datasetItem['mapPose'].rotation.z, datasetItem['mapPose'].rotation.w);

        var clickCamera = scope._poseToThreeJS(placenoteCamera); // Create new camera for transformed dataset camera


        scope.keyframeNames.push(datasetItem['fileName']);
        scope.ptCameras.push(clickCamera);
      });
      onComplete();
    };
    /**
    * @desc HELPER METHOD: Converts camera with Placenote Pose to Three JS pose
    * @param camera The base camera oriented with the Placenote Pose
    * @return camera The transformed camera oriented with the Three JS Pose
    */


    PlacenoteMesh.prototype._poseToThreeJS = function (camera) {
      // Camera position
      var mapPose = new threeFull.Vector3(camera.position.x, camera.position.y, camera.position.z); // Camera rotation

      var mapOrientationVect = new threeFull.Vector4(camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w);
      mapOrientationVect.normalize();
      var mapOrientation = new threeFull.Quaternion(mapOrientationVect.x, mapOrientationVect.y, mapOrientationVect.z, mapOrientationVect.w); // Create matrix of whole pose

      var mapMatrix = new threeFull.Matrix4();
      mapMatrix.compose(mapPose, mapOrientation, new threeFull.Vector3(1, 1, 1)); // transform by 180 in z then 180 in y

      var ztransform_180 = new threeFull.Matrix4();
      ztransform_180.set(-1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      var ytransform_180 = new threeFull.Matrix4();
      ytransform_180.set(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1);
      var mapPoseInArkitFrame = mapMatrix.premultiply(ztransform_180).multiply(ytransform_180);

      var finalPose = this._getPosition(mapPoseInArkitFrame);

      var finalRot = this._getRotation(mapPoseInArkitFrame);

      var transformedCamera = new threeFull.PerspectiveCamera(50, camera.aspect, 0.1, 4);
      transformedCamera.position.set(finalPose.x, finalPose.y, finalPose.z);
      transformedCamera.quaternion.set(finalRot.x, finalRot.y, finalRot.z, finalRot.w);
      return transformedCamera;
    };
    /**
    * @desc HELPER METHOD: Returns position vector given 4x4matrix
    * @param matrix THREE.Matrix4: The transformation matrix
    * @return THREE.Vector3 position from transformation matrix
    */


    PlacenoteMesh.prototype._getPosition = function (matrix) {
      var position = new threeFull.Vector3(matrix.elements[12], matrix.elements[13], matrix.elements[14]);
      return position;
    };
    /**
    * @desc HELPER METHOD: Returns quaternion rotation given 4x4matrix
    * @param matrix THREE.Matrix4: The transformation matrix
    * @return THREE.Quaternion quaternion from transformation matrix
    */


    PlacenoteMesh.prototype._getRotation = function (matrix) {
      var rotation = new threeFull.Quaternion();
      rotation.setFromRotationMatrix(matrix);
      return rotation;
    };

    return PlacenoteMesh;
  }();

  exports.PlacenoteMesh = PlacenoteMesh;

  return exports;

}({}, JSZip, JSZipUtils, Three));
