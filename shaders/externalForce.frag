uniform sampler2D velocity;
uniform vec2 force;
uniform vec2 fboSize;
varying vec2 vUv;

void main() { 
    vec2 st = gl_FragCoord.xy / fboSize;
    vec2 oldVel = sampler2D(velocity, st);

    // The more mouse-centered, the larger the value.
    float intensity = 1.0 - min(length(vUv * 2.0 - 1.0), 1.0);
    // Just add the size of the mouse at the uv point to the velocity.
    gl_FragColor = vec4(oldVel + intensity * force, 0, d);
}