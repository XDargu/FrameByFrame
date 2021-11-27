import * as BABYLON from 'babylonjs';

// Capsule, move somewhere else. Babylon 4.2.0 has capsule built-in, but performance is much worse. Use this until we find out why.
export default function CreateCapsule(name: string, args: any, scene: BABYLON.Scene) : BABYLON.Mesh
{
    let mesh = new BABYLON.Mesh(name, scene)
    let path = args.orientation || BABYLON.Vector3.Right()
    let subdivisions = Math.max(args.subdivisions?args.subdivisions:2, 1)
    let tessellation = Math.max(args.tessellation?args.tessellation:16, 3)
    let height = Math.max(args.height?args.height:2, 0.)
    let radius = Math.max(args.radius?args.radius:1, 0.)
    let capRadius = Math.max(args.capRadius?args.capRadius:radius, radius)
    let capDetail = Math.max(args.capDetail?args.capDetail:6, 1)

    let  radialSegments = tessellation;
	let  heightSegments = subdivisions;

    let radiusTop = Math.max(args.radiusTop?args.radiusTop:radius, 0.)
    let radiusBottom = Math.max(args.radiusBottom?args.radiusBottom:radius, 0.)

    let thetaStart = args.thetaStart || 0.0
    let thetaLength = args.thetaLength || (2.0 * Math.PI)

    let capsTopSegments = Math.max(args.topCapDetail?args.topCapDetail:capDetail, 1)
    let capsBottomSegments = Math.max(args.bottomCapDetail?args.bottomCapDetail:capDetail, 1)

    var alpha = Math.acos((radiusBottom-radiusTop)/height)
    var eqRadii = (radiusTop-radiusBottom === 0)

    var indices = []
	var vertices = []
	var normals = []
	var uvs = []
    
    var index = 0,
	    indexOffset = 0,
	    indexArray = [],
	    halfHeight = height / 2;
    
    var x, y;
    var normal = BABYLON.Vector3.Zero();
    var vertex = BABYLON.Vector3.Zero();

    var cosAlpha = Math.cos(alpha);
    var sinAlpha = Math.sin(alpha);

    var cone_length =
        new BABYLON.Vector2(
            radiusTop*sinAlpha,
            halfHeight+radiusTop*cosAlpha
            ).subtract(new BABYLON.Vector2(
                radiusBottom*sinAlpha,
                -halfHeight+radiusBottom*cosAlpha
            )
        ).length();

    // Total length for v texture coord
    var vl = radiusTop*alpha
                + cone_length
                + radiusBottom*(Math.PI/2-alpha);

    var groupCount = 0;

    // generate vertices, normals and uvs

    var v = 0;
    for( y = 0; y <= capsTopSegments; y++ ) {

        var indexRow = [];

        var a = Math.PI/2 - alpha*(y / capsTopSegments);

        v += radiusTop*alpha/capsTopSegments;

        var cosA = Math.cos(a);
        var sinA = Math.sin(a);

        // calculate the radius of the current row
        var _radius = cosA*radiusTop;

        for ( x = 0; x <= radialSegments; x ++ ) {

            var u = x / radialSegments;

            var theta = u * thetaLength + thetaStart;

            var sinTheta = Math.sin( theta );
            var cosTheta = Math.cos( theta );

            // vertex
            vertex.x = _radius * sinTheta;
            vertex.y = halfHeight + sinA*radiusTop;
            vertex.z = _radius * cosTheta;
            vertices.push( vertex.x, vertex.y, vertex.z );

            // normal
            normal.set( cosA*sinTheta, sinA, cosA*cosTheta );
            normals.push( normal.x, normal.y, normal.z );
            // uv
            uvs.push( u, 1 - v/vl );
            // save index of vertex in respective row
            indexRow.push( index );
            // increase index
            index ++;
        }

        // now save vertices of the row in our index array
        indexArray.push( indexRow );

    }

    var cone_height = height + cosAlpha*radiusTop - cosAlpha*radiusBottom;
    var slope = sinAlpha * ( radiusBottom - radiusTop ) / cone_height;
    for ( y = 1; y <= heightSegments; y++ ) {

        var indexRow = [];

        v += cone_length/heightSegments;

        // calculate the radius of the current row
        var _radius = sinAlpha * ( y * ( radiusBottom - radiusTop ) / heightSegments + radiusTop);

        for ( x = 0; x <= radialSegments; x ++ ) {

            var u = x / radialSegments;

            var theta = u * thetaLength + thetaStart;

            var sinTheta = Math.sin( theta );
            var cosTheta = Math.cos( theta );

            // vertex
            vertex.x = _radius * sinTheta;
            vertex.y = halfHeight + cosAlpha*radiusTop - y * cone_height / heightSegments;
            vertex.z = _radius * cosTheta;
            vertices.push( vertex.x, vertex.y, vertex.z );

            // normal
            normal.set( sinTheta, slope, cosTheta ).normalize();
            normals.push( normal.x, normal.y, normal.z );

            // uv
            uvs.push( u, 1 - v/vl );

            // save index of vertex in respective row
            indexRow.push( index );

            // increase index
            index ++;

        }

        // now save vertices of the row in our index array
        indexArray.push( indexRow );

    }

    for( y = 1; y <= capsBottomSegments; y++ ) {

        var indexRow = [];

        var a = (Math.PI/2 - alpha) - (Math.PI - alpha)*( y / capsBottomSegments);

        v += radiusBottom*alpha/capsBottomSegments;

        var cosA = Math.cos(a);
        var sinA = Math.sin(a);

        // calculate the radius of the current row
        var _radius = cosA*radiusBottom;

        for ( x = 0; x <= radialSegments; x ++ ) {

            var u = x / radialSegments;

            var theta = u * thetaLength + thetaStart;

            var sinTheta = Math.sin( theta );
            var cosTheta = Math.cos( theta );

            // vertex
            vertex.x = _radius * sinTheta;
            vertex.y = -halfHeight + sinA*radiusBottom;;
            vertex.z = _radius * cosTheta;
            vertices.push( vertex.x, vertex.y, vertex.z );

            // normal
            normal.set( cosA*sinTheta, sinA, cosA*cosTheta );
            normals.push( normal.x, normal.y, normal.z );

            // uv
            uvs.push( u, 1 - v/vl );

            // save index of vertex in respective row
            indexRow.push( index );
            // increase index
            index ++;
        }
        // now save vertices of the row in our index array
        indexArray.push( indexRow );
    }
    // generate indices
    for ( x = 0; x < radialSegments; x ++ ) {
        for ( y = 0; y < capsTopSegments + heightSegments + capsBottomSegments; y ++ ) {
            // we use the index array to access the correct indices
            var i1 = indexArray[ y ][ x ];
            var i2 = indexArray[ y + 1 ][ x ];
            var i3 = indexArray[ y + 1 ][ x + 1 ];
            var i4 = indexArray[ y ][ x + 1 ];
            // face one
            indices.push( i1 ); 
            indices.push( i2 );
            indices.push( i4 );
            // face two
            indices.push( i2 ); 
            indices.push( i3 );
            indices.push( i4 );
        }
    }
    indices = indices.reverse()

    let vDat = new BABYLON.VertexData()
    vDat.positions = vertices
    vDat.normals = normals
    vDat.uvs = uvs
    vDat.indices = indices

    vDat.applyToMesh(mesh)
    return mesh
}