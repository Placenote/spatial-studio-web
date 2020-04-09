# spatial-studio-web

Spatial Studio web is a a placenote frontend module that allows for viewing of Placenote meshes in the browser. Web 3D rendering is accomplished using THREE.js a popular web 3D framework. Interaction with the mesh is made possible with the Placenote Web API.

The Placenote Web API allows for:
* Viewing or downloading the world mesh as an OBJ file
* Providing raycast based hit testing on the world mesh 
* Writing data to Placenote meta data store 

# Web Development
Install the Google Chrome Extension 'Web Server for Chrome', and choose the folder that contains spatial-studio-web.
### Get Started
Please install dependencies by running `npm install` in Lib/mesh-manager.js/ folder.

### Build
To build you can run `npm run build`. This will create 3 .js files in Lib/mesh-manager.js/build/ folder.

### Run
To run, navigate to the localhost link provided by 'Web Server for Chrome'.