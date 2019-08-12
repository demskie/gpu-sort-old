precision mediump float;
precision mediump int;
precision mediump sampler2D;

uniform sampler2D u_indices;
uniform sampler2D u_firstFourBytes;

uniform float u_wireLength;
uniform float u_groupSize;

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

	// get booleans for determining relative position and sorting order
	float xCoord = floor(currentLookupCoord.x);
	float firstPeerBool = floatLessThan(mod(xCoord, (2.0 * u_wireLength)), u_wireLength);
	float ascendingGroupBool = floatEquals(mod(((xCoord - mod(xCoord, u_groupSize)) / u_groupSize), 2.0), 0.0);

	// calculate peer fragCoord
	vec2 peerFragCoord = vec2(gl_FragCoord.xy);
	addToVec2(peerFragCoord, u_wireLength * firstPeerBool, TEXTURE_WIDTH);
	addToVec2(peerFragCoord, -1.0 * u_wireLength * floatEquals(firstPeerBool, 0.0), TEXTURE_WIDTH);

	// get peer lookup coordinates
	vec4 peerLookupTexel = texture2D(u_indices, peerFragCoord.xy / TEXTURE_WIDTH);
	vec2 peerLookupCoord = vec2(vec2ToInt16(peerLookupTexel.rg) + 0.5, 
								vec2ToInt16(peerLookupTexel.ba) + 0.5);

	// TODO
}
