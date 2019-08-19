precision mediump float;
precision mediump int;
precision mediump sampler2D;

attribute vec3 position;

uniform sampler2D u_scatter;

const float TEXTURE_WIDTH = ${textureWidth};

float vec2ToInt16(vec2 v) { return clamp(floor(floor(v.r * 255.0) * 256.0) + floor(v.g * 255.0) - 32767.0, -32767.0, 32768.0); }

void main() {
	vec4 scatterTexel = texture2D(u_scatter, position.xy);
	vec2 scatterCoord = vec2(vec2ToInt16(scatterTexel.rg) + 0.5, 
							 vec2ToInt16(scatterTexel.ba) + 0.5) / TEXTURE_WIDTH;
	gl_Position = vec4(scatterCoord.x, scatterCoord.y, position.z, 1.0);
}