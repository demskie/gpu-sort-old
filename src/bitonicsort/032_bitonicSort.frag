precision mediump float;
precision mediump int;
precision mediump sampler2D;

uniform sampler2D u_indices;
uniform sampler2D u_firstByteSlice;

uniform float u_wireLengthX;
uniform float u_wireLengthY;
uniform float u_regionSizeX;
uniform float u_regionSizeY;

const float TEXTURE_WIDTH = ${textureWidth};

float round(float f) { return floor(f + 0.5); }
float floatEquals(float f1, float f2) { return 1.0 - abs(sign(f1 - f2)); }
float floatNotEquals(float f1, float f2) { return abs(sign(f1 - f2)); }
float floatLessThan(float f1, float f2) { return max(sign(f2 - f1), 0.0); }
float floatGreaterThan(float f1, float f2) { return max(sign(f1 - f2), 0.0); }
float floatLessThanOrEqual(float f1, float f2) { return 1.0 - floatGreaterThan(f1, f2); }
float floatGreaterThanOrEqual(float f1, float f2) { return 1.0 - floatLessThan(f1, f2); }
float vec2ToInt16(vec2 v) { return clamp(floor(floor(v.r * 255.0) * 256.0) + floor(v.g * 255.0) - 32767.0, -32767.0, 32768.0); }
vec2 int16ToVec2(float f) { f = clamp(f, -32767.0, 32768.0) + 32767.0; return vec2(floor(f / 256.0), f - floor(f / 256.0) * 256.0) / 255.0; }
vec2 addToVec2(vec2 v, float f, float w) { v.y += floor((v.x + f) / w); v.x = mod(v.x + f, w); return v; }

void main() {
	// get current lookup coordinates
	vec4 currentLookupTexel = texture2D(u_indices, gl_FragCoord.xy / TEXTURE_WIDTH);
	vec2 currentLookupCoord = vec2(vec2ToInt16(currentLookupTexel.rg) + 0.5,
								   vec2ToInt16(currentLookupTexel.ba) + 0.5);

	// calculate starting coordinates for each sorting behavior
	vec2 ascendingStartCoord = vec2(gl_FragCoord.x - floor(mod(floor(gl_FragCoord.x), u_regionSizeX)),
									gl_FragCoord.y - floor(mod(floor(gl_FragCoord.y), u_regionSizeY)));
	vec2 descendingStartCoord = vec2(ascendingStartCoord.x + u_regionSizeX / 2.0,
									 ascendingStartCoord.y + u_regionSizeY / 2.0);

	// get booleans for determining relative position and sorting order
	float ascendingGroupBool = floatLessThan(floor(gl_FragCoord.x), floor(descendingStartCoord.x)) * 
							   floatLessThan(floor(gl_FragCoord.y), floor(descendingStartCoord.y));
	vec2 middleStartCoord = (floatEquals(ascendingGroupBool, 1.0) * vec2(ascendingStartCoord.x + floor(u_regionSizeX / 4.0), ascendingStartCoord.y + floor(u_regionSizeY / 4.0))) +
	                        (floatEquals(ascendingGroupBool, 0.0) * vec2(descendingStartCoord.x + floor(u_regionSizeX / 4.0), descendingStartCoord.y + floor(u_regionSizeY / 4.0)));
	float firstTexelBool = floatLessThan(floor(gl_FragCoord.x), floor(middleStartCoord.x)) *
						   floatLessThanOrEqual(floor(gl_FragCoord.y), floor(middleStartCoord.y));

	gl_FragColor = vec4(int16ToVec2(ascendingGroupBool), int16ToVec2(firstTexelBool));

	// calculate peer fragCoord
	vec2 peerFragCoord = vec2(gl_FragCoord.xy);
	peerFragCoord.x += floatEquals(firstTexelBool, 1.0) * u_wireLengthX;
	peerFragCoord.y += floatEquals(firstTexelBool, 1.0) * u_wireLengthY;
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
	// gl_FragColor = peerLookupTexel * floatEquals(swapBool, 1.0)
	// 			 + currentLookupTexel * floatEquals(notSwapBool, 1.0);

	
}
