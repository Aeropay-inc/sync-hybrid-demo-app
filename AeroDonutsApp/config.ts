/**
 * Demo configuration.
 *
 * BASE_URL must point at the machine running the WebApp Express server, reachable
 * from the device/emulator. Update it before a demo:
 *   - Physical device: your machine's LAN IP (e.g. http://192.168.1.178:3000)
 *   - Android emulator: http://10.0.2.2:3000
 *   - iOS simulator:    http://localhost:3000
 */
export const BASE_URL = 'http://192.168.1.178:3000';

/** Deep link scheme AeroSync redirects back to after OAuth. */
export const DEEP_LINK_SCHEME = 'aerodonutapp://';
