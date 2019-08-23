#ifdef GL_ES
precision mediump float;
precision mediump int;
precision mediump sampler2D;
#endif

uniform sampler2D u_indices;
uniform sampler2D u_firstByteSlice;

uniform float u_blockSizeX;
uniform float u_blockSizeY;
uniform float u_regionSizeX;
uniform float u_regionSizeY;

const float TEXTURE_WIDTH = 1.0;

float round(float f);
float floatEquals(float f1, float f2);
float floatNotEquals(float f1, float f2);
float floatLessThan(float f1, float f2);
float floatGreaterThan(float f1, float f2);
float floatLessThanOrEqual(float f1, float f2);
float floatGreaterThanOrEqual(float f1, float f2);
float vec2ToInt16(vec2 v);
vec2 int16ToVec2(float f);
vec2 addToVec2(vec2 v, float f, float w);

void main() {
	// get current lookup coordinates
	vec4 currentLookupTexel = texture2D(u_indices, gl_FragCoord.xy / TEXTURE_WIDTH);
	vec2 currentLookupCoord = vec2(vec2ToInt16(currentLookupTexel.rg) + 0.5,
								   vec2ToInt16(currentLookupTexel.ba) + 0.5);
	
	// calculate starting coordinates for this block
	vec2 blockStartCoord  = vec2(gl_FragCoord.x - floor(mod(floor(gl_FragCoord.x), u_blockSizeX)),
								 gl_FragCoord.y - floor(mod(floor(gl_FragCoord.y), u_blockSizeY)));
	vec2 blockOffset      = vec2(floatEquals(u_blockSizeY, 1.0) * u_blockSizeX, floatGreaterThan(u_blockSizeY, 1.0) * u_blockSizeY);
	vec2 halfBlockOffset  = vec2(floatEquals(blockOffset.y, 0.0) * blockOffset.x / 2.0 +
								 floatEquals(blockOffset.y, 1.0) * floatEquals(blockOffset.x, 0.0) * TEXTURE_WIDTH / 2.0, 
								 floor(blockOffset.y / 2.0));
	vec2 blockMiddleCoord = vec2(blockStartCoord.xy) + halfBlockOffset;

	// calculate starting coordinates for each sorting behavior
	vec2 ascendingStartCoord  = vec2(gl_FragCoord.x - floor(mod(floor(gl_FragCoord.x), u_regionSizeX)),
									 gl_FragCoord.y - floor(mod(floor(gl_FragCoord.y), u_regionSizeY)));
	vec2 regionOffset         = vec2(floatEquals(u_regionSizeY, 1.0) * u_regionSizeX, floatGreaterThan(u_regionSizeY, 1.0) * u_regionSizeY);
	vec2 halfRegionOffset     = vec2(floatEquals(regionOffset.y, 0.0) * regionOffset.x / 2.0 +
									 floatEquals(regionOffset.y, 1.0) * floatEquals(regionOffset.x, 0.0) * TEXTURE_WIDTH / 2.0, 
									 floor(regionOffset.y / 2.0));
	vec2 descendingStartCoord = vec2(ascendingStartCoord.xy) + halfRegionOffset;

	// get booleans for determining relative position and sorting order
	float ascendingGroupBool = floatLessThan(floor(gl_FragCoord.y), floor(descendingStartCoord.y));
	ascendingGroupBool      += floatEquals(floor(gl_FragCoord.y), floor(descendingStartCoord.y)) * 
						       floatLessThan(floor(gl_FragCoord.x), floor(descendingStartCoord.x));		   
	float firstTexelBool     = floatLessThan(floor(gl_FragCoord.y), floor(blockMiddleCoord.y));
	firstTexelBool          += floatEquals(floor(gl_FragCoord.y), floor(blockMiddleCoord.y)) * 
					           floatLessThan(floor(gl_FragCoord.x), floor(blockMiddleCoord.x));

	// calculate peer fragCoord
	vec2 peerFragCoord = vec2(gl_FragCoord.xy);
	peerFragCoord += floatEquals(firstTexelBool, 1.0) * halfBlockOffset;
	peerFragCoord -= floatEquals(firstTexelBool, 0.0) * halfBlockOffset;

	// get peer lookup coordinates
	vec4 peerLookupTexel = texture2D(u_indices, peerFragCoord.xy / TEXTURE_WIDTH);
	vec2 peerLookupCoord = vec2(vec2ToInt16(peerLookupTexel.rg) + 0.5,
								vec2ToInt16(peerLookupTexel.ba) + 0.5);

	// start creating alpha and bravo coordinates where alpha is expected to be less than bravo
	vec2 alphaLookupCoord = floatEquals(firstTexelBool, 1.0) * floatEquals(ascendingGroupBool, 1.0) * vec2(currentLookupCoord.xy)
						  + floatEquals(firstTexelBool, 1.0) * floatEquals(ascendingGroupBool, 0.0) * vec2(peerLookupCoord.xy)
						  +	floatEquals(firstTexelBool, 0.0) * floatEquals(ascendingGroupBool, 1.0)	* vec2(peerLookupCoord.xy)
						  +	floatEquals(firstTexelBool, 0.0) * floatEquals(ascendingGroupBool, 0.0)	* vec2(currentLookupCoord.xy);
	vec2 bravoLookupCoord = floatEquals(firstTexelBool, 1.0) * floatEquals(ascendingGroupBool, 1.0) * vec2(peerLookupCoord.xy)
						  +	floatEquals(firstTexelBool, 1.0) * floatEquals(ascendingGroupBool, 0.0) * vec2(currentLookupCoord.xy)
						  +	floatEquals(firstTexelBool, 0.0) * floatEquals(ascendingGroupBool, 1.0)	* vec2(currentLookupCoord.xy)
						  +	floatEquals(firstTexelBool, 0.0) * floatEquals(ascendingGroupBool, 0.0)	* vec2(peerLookupCoord.xy);

	// get data for comparison
	vec4 alphaData = texture2D(u_firstByteSlice, alphaLookupCoord.xy / TEXTURE_WIDTH);
	vec4 bravoData = texture2D(u_firstByteSlice, bravoLookupCoord.xy / TEXTURE_WIDTH);

	// initializing booleans to false
	float swapBool = 0.0;
	float notSwapBool = 0.0;

	// compare each byte in order to determine if swap is necessary
	swapBool    += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatGreaterThan(alphaData.r, bravoData.r);
	notSwapBool += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatLessThan(alphaData.r, bravoData.r);
	swapBool    += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatGreaterThan(alphaData.g, bravoData.g);
	notSwapBool += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatLessThan(alphaData.g, bravoData.g);
	swapBool    += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatGreaterThan(alphaData.b, bravoData.b);
	notSwapBool += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatLessThan(alphaData.b, bravoData.b);
	swapBool    += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatGreaterThan(alphaData.a, bravoData.a);
	notSwapBool += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatLessThan(alphaData.a, bravoData.a);

	// handle edge case where bytes are identical and thus both booleans are false
	notSwapBool += floatEquals(notSwapBool, 0.0) * floatEquals(swapBool, 0.0);

	// use booleans to render the correct lookup texel
	gl_FragColor = peerLookupTexel * floatEquals(swapBool, 1.0)
	 			 + currentLookupTexel * floatEquals(notSwapBool, 1.0);
}
