precision mediump float;
precision mediump int;
precision mediump sampler2D;

uniform sampler2D u_indices;
uniform sampler2D u_firstByteSlice;

uniform float u_wireLengthX;
uniform float u_wireLengthY;
uniform float u_groupSizeX;
uniform float u_groupSizeY;

const float TEXTURE_WIDTH = ${textureWidth};

float round(float f) { return floor(f + 0.5); }
float floatEquals(float f1, float f2) { return 1.0 - abs(sign(f1 - f2)); }
float floatNotEquals(float f1, float f2) { return abs(sign(f1 - f2)); }
float floatLessThan(float f1, float f2) { return max(sign(f2 - f1), 0.0); }
float floatGreaterThan(float f1, float f2) { return max(sign(f1 - f2), 0.0); }
float floatLessThanOrEqual(float f1, float f2) { return 1.0 - floatGreaterThan(f1, f2); }
float floatGreaterThanOrEqual(float f1, float f2) { return 1.0 - floatLessThan(f1, f2); }
float vec2ToInt16(vec2 v) { return clamp(floor(floor(v.r * 255.0) * 256.0) + floor(v.g * 255.0) - 32767.0, -32767.0, 32768.0); }
vec2 addToVec2(vec2 v, float f, float w) { v.y += floor((v.x + f) / w); v.x = mod(v.x + f, w); return v; }

void main() {
	// get current lookup coordinates
	vec4 currentLookupTexel = texture2D(u_indices, gl_FragCoord.xy / TEXTURE_WIDTH);
	vec2 currentLookupCoord = vec2(vec2ToInt16(currentLookupTexel.rg) + 0.5, 
								   vec2ToInt16(currentLookupTexel.ba) + 0.5);

	// ascendingStartCoord
	vec2 ascendingStartCoord = vec2(mod(floor(gl_FragCoord.x), u_groupSizeX * 2.0) + 0.5,
									mod(floor(gl_FragCoord.y), u_groupSizeY * 2.0) + 0.5);
	vec2 descendingStartCoord = vec2(ascendingStartCoord.x + u_groupSizeX,
									 ascendingStartCoord.y + u_groupSizeY);

	// get booleans for determining relative position and sorting order
	float firstTexelBool = floatLessThanOrEqual(gl_FragCoord.x, mod(floor(gl_FragCoord.x), u_groupSizeX) + (u_groupSizeX / 2.0) + 0.5) *
						   floatLessThanOrEqual(gl_FragCoord.y, mod(floor(gl_FragCoord.y), u_groupSizeY) + (u_groupSizeY / 2.0) + 0.5);
	float ascendingGroupBool = floatLessThan(gl_FragCoord.x, descendingStartCoord.x) * 
							   floatLessThan(gl_FragCoord.y, descendingStartCoord.y);

	// calculate peer fragCoord
	vec2 peerFragCoord = vec2(gl_FragCoord.xy);
	peerFragCoord.x += firstTexelBool * u_wireLengthX;
	peerFragCoord.y += firstTexelBool * u_wireLengthY;
	peerFragCoord.x -= floatEquals(firstTexelBool, 0.0) * u_wireLengthX;
	peerFragCoord.y -= floatEquals(firstTexelBool, 0.0) * u_wireLengthY;

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
	float finishedBool = 0.0;
	float shouldSwapBool = 0.0;

	// if (finishedBool == false && alphaData < bravoData) finishedBool++
	finishedBool += floatEquals(finishedBool, 0.0) * floatLessThan(alphaData.r, bravoData.r);
	finishedBool += floatEquals(finishedBool, 0.0) * floatLessThan(alphaData.g, bravoData.g);
	finishedBool += floatEquals(finishedBool, 0.0) * floatLessThan(alphaData.b, bravoData.b);
	finishedBool += floatEquals(finishedBool, 0.0) * floatLessThan(alphaData.a, bravoData.a);
	
	// if (finishedBool == false && shouldSwapBool == false && alphaData > peerData) shouldSwap++
	shouldSwapBool += floatEquals(finishedBool, 0.0) * floatEquals(shouldSwapBool, 0.0) * floatGreaterThan(alphaData.r, bravoData.r);
	shouldSwapBool += floatEquals(finishedBool, 0.0) * floatEquals(shouldSwapBool, 0.0) * floatGreaterThan(alphaData.g, bravoData.g);
	shouldSwapBool += floatEquals(finishedBool, 0.0) * floatEquals(shouldSwapBool, 0.0) * floatGreaterThan(alphaData.b, bravoData.b);
	shouldSwapBool += floatEquals(finishedBool, 0.0) * floatEquals(shouldSwapBool, 0.0) * floatGreaterThan(alphaData.a, bravoData.a);
	
	// if (finishedBool == false && shouldSwapBool == true) finishedBool++
	finishedBool += floatEquals(finishedBool, 0.0) * floatEquals(shouldSwapBool, 1.0);

	// swap lookup texel if shouldSwapBool == true
	gl_FragColor = shouldSwapBool * peerLookupTexel + floatEquals(shouldSwapBool, 0.0) * currentLookupTexel;
}
