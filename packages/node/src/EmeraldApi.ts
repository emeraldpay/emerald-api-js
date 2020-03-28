import {BlockchainClient} from "./wrapped/BlockchainClient";
import {CredentialsContext, emeraldCredentials} from "./credentials";
import {MonitoringClient} from "./wrapped/MonitoringClient";

const certDev = '-----BEGIN CERTIFICATE-----\n' +
    'MIIFgjCCA2qgAwIBAgIBATANBgkqhkiG9w0BAQsFADBhMRswGQYDVQQKExJFbWVy\n' +
    'YWxkUGF5IFN0YWdpbmcxHjAcBgNVBAsTFUVtZXJhbGRQYXkgU3RhZ2luZyBDQTEi\n' +
    'MCAGA1UEAxMZY2Euc3RhZ2luZy5lbWVyYWxkcGF5LmRldjAeFw0xOTA2MTQyMDQ4\n' +
    'NTBaFw0yMDEyMTQyMDQ4NTBaMGExGzAZBgNVBAoTEkVtZXJhbGRQYXkgU3RhZ2lu\n' +
    'ZzEeMBwGA1UECxMVRW1lcmFsZFBheSBTdGFnaW5nIENBMSIwIAYDVQQDExljYS5z\n' +
    'dGFnaW5nLmVtZXJhbGRwYXkuZGV2MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIIC\n' +
    'CgKCAgEA0o1BoOsYa8IvrgI0KEOh8p8Erq1qLolcaikvKYW3QBTJIuHrR5Jvo3Ia\n' +
    '1cBtGlsH6lWHPHdN9udbI67J8Wlx2Af0oDlf4YA1/iBAAwzaWocMfI8TpBpYLZrs\n' +
    'uHv+UtnA0MjtbSiG3206yhVxLRJfN/857JbjAkv912JAT3yXjylXTVOFTbks7PD6\n' +
    's1B2bOwiXbv/RY8HnOwNKgeYRzJVcZMisOJ+nSmGa5u2ah1TLCV20ivrTIyludqa\n' +
    'ssyXDFXmrHvu5Ey6J5+A3jVmY6l/9MeZO6UvNG1voqkhdT3bvgI4KRetFCAjSa/T\n' +
    'Ovakw3oAuJlYPWR9eiMhBIdNMZn1Cdna9QspK/s+atLfEZksBDBg8DWC4TFzoyM0\n' +
    'TyMkVh6hWCyQ3t7nBbHinzXOd7nNPJ3Nz3u+FYrGcb36GXSOXzKVuGiGGLvrR8Jo\n' +
    '58nFEfAsiiVMlTWPIBLInX05eFhP0vyQ375zh6+lwBJ6OqhCTS66IyjH3vTvJmC0\n' +
    'vX2o0aUgSpf2WhvIKhk6svcZFemPYnd+ZqPGgjDwymWb6gA/gHQF8AX5IXTk1YCT\n' +
    'O5LCgbt9FzYaAxwbYQB3dVPNkJfCdDXfg8UVyVkl8yPgZbxQLazpiNvUr32qVlyS\n' +
    'xM9PlaCF/GscTOk75ayrJrriv26BufR5vpDVZmRI3TcnSkieltMCAwEAAaNFMEMw\n' +
    'DgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0OBBYEFFK/\n' +
    'lakFlLnT68blTskBrZXPjMWxMA0GCSqGSIb3DQEBCwUAA4ICAQAzbPoRndIjGYJe\n' +
    'EWTRdiNeuJ8cpeRWmbRme67mnw7JsTGFvbrRPYmPpFKKw9hzDN7ILbXLuw3eaKLR\n' +
    'jRowxqXwBqRJE1WthF/x7W1ylxGFXCm3z5NzNYJjeHsy1LjLAiDcZTngP4PJRJb+\n' +
    'UN3dfE/jO27WvPu7skvKNX8irhiTviFeErmH/GSqmKqm5SoUv+qYGAEo6y3/B/H0\n' +
    'OgssftnMv2cyO9GO7c7GIlILnelK8diLDBWFBR6l/DDP2zbW25/tJCUYMjfEUfVl\n' +
    '/AA8vb4lJ+oO2pbj24dkahlYaCcvl4Y/xrEIygg9lZ/HM69Pj3M+dXQNDoZQ+BEy\n' +
    '6/of9rB7WFevore/9cVA98jGo5iZMZNDthiQptLL5zTX7QEQ909XRk0AVylaFkY7\n' +
    '9MU6XFYavFXU3AP6Cr027kw80WEW184YhL3yVfP9ae/Z3Kc3u3gNxX9Ac/dn7cej\n' +
    'UVHcs3Px5isgUDZOvl6LlA0VJaFi4zHZMP58jb3APVg/zEyKx6uohYWcanG7oC/h\n' +
    'rUSN3Y/9MEKPAEAxopRZH4srT1SLpPXeoZqZo5am2e4ttqK/uATj+LCiOB8iK9u8\n' +
    '1BqkK3YdAvljfAp8MxEispyJlznyFFbQ0xSIxBeQhh0MjhgFYhasZ5RGSg/K44VB\n' +
    'MwdfWdNfjQ7l+DFpz+mH6s/T/RjBWg==\n' +
    '-----END CERTIFICATE-----';

const hostDev = "35.241.3.151:443";

const DEFAULT_HOSTNAME = "35.241.3.151:443";

export class EmeraldApi {
    private readonly hostname: string;
    private readonly credentials: CredentialsContext;

    constructor(hostname?: string | undefined) {
        this.hostname = hostname || hostDev;
        this.credentials = emeraldCredentials(this.hostname, certDev, [], "test");
    }

    blockchain(): BlockchainClient {
        return new BlockchainClient(this.hostname, this.credentials.getChannelCredentials());
    }

    monitoring(): MonitoringClient {
        return new MonitoringClient(this.hostname, this.credentials.getChannelCredentials());
    }
}