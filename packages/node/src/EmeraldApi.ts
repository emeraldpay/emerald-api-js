import {BlockchainClient} from "./wrapped/BlockchainClient";
import {CredentialsContext, emeraldCredentials} from "./credentials";
import {MonitoringClient} from "./wrapped/MonitoringClient";
import {MarketClient} from "./wrapped/MarketClient";

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

const certLocal = '-----BEGIN CERTIFICATE-----\n' +
    'MIIE4zCCAsugAwIBAgIQHgCBkxi2xOHMNb4vvXKSxTANBgkqhkiG9w0BAQsFADBs\n' +
    'MQswCQYDVQQGEwJDSDEMMAoGA1UEBxMDWnVnMRcwFQYDVQQKEw5FbWVyYWxkUGF5\n' +
    'IERldjEaMBgGA1UECxMRRW1lcmFsZFBheSBEZXYgQ0ExGjAYBgNVBAMTEWNhLmVt\n' +
    'ZXJhbGRwYXkuZGV2MB4XDTE5MDYwMjAyNDAzOFoXDTIwMTIwMjAyNDAzM1owaTEL\n' +
    'MAkGA1UEBhMCQ0gxDDAKBgNVBAcTA1p1ZzEXMBUGA1UEChMORW1lcmFsZFBheSBE\n' +
    'ZXYxHzAdBgNVBAsTFkVtZXJhbGRQYXkgR1JQQyBTZXJ2ZXIxEjAQBgNVBAMTCTEy\n' +
    'Ny4wLjAuMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALzVy2UFafC2\n' +
    'RpCnO95nrWSxT4gcids5RquyNdRY+O4HHzjaHAD4d/j9G1kZ0J0Ly+145xBuTxRK\n' +
    'FZ5GUo/Lp1FEW56CSHcB25hineTjaOPB/60SLy//1oN5/ow+wr+X6bjlMoELJIfl\n' +
    'votey8Bos0lal6M2mDxw9smP42KzpkuZCdHH222AxIOs6BQpFnMuhsTAXF/avpkp\n' +
    '+8clIof1e2CRaUQ4QQNQwcoi1VFTkWNwLh+wZRjNObFJt2Ng1rCIEycHluLcF3TQ\n' +
    'cOKXOmgklbjNqaFEg7ckyarg0/lauLtH9iVqx2MozZ8l1orHwXaoY7QZKo7exhEG\n' +
    'yOXtphT3RUkCAwEAAaOBgzCBgDAOBgNVHQ8BAf8EBAMCA7gwHQYDVR0lBBYwFAYI\n' +
    'KwYBBQUHAwEGCCsGAQUFBwMCMB0GA1UdDgQWBBRuR40Vyq/HnRY9Gj1tv/XHIpwY\n' +
    'ejAfBgNVHSMEGDAWgBSctyWodQE+97ZiTBJf/bEh8LwujzAPBgNVHREECDAGhwR/\n' +
    'AAABMA0GCSqGSIb3DQEBCwUAA4ICAQATzvKN+Nzv8mjw/qxcls8L0jNtjXXCTJyx\n' +
    '3t21APVNPZXSBbZsWOrzTDT6u2RDnaY2qR61DjCl2LElWPQRAtioh9zV2y+r/O1T\n' +
    'L7LGXqtB5S5e8SoEHU4cAHt9jzkUnCCR4HqxxuYUSreb76xF6NkdKbTIaaJxfmPJ\n' +
    'mO3SB2ayHVfbUkmDY3jh+0xgPRsizJq2Yi8HyJfgWe6nO3nDrrhPgBsHRGFHkZUY\n' +
    '1XSWzrTJcZ10kPFnN8Xq7fbT+qb2ACfcNluD7lv3g/jvpz+LpCn3oHNx+As6XZo0\n' +
    'bbamXAwE79qxt7OgkabXOPfAm00c5AOJBF6JlYXhzM/m834EHGZvBf/YoD2ocfj6\n' +
    '5MBq6UcxqormY8Go/wLff0nMpu7uzRnr1p3vbPcfjwPq3rHprh7gOw6mxfno3vXy\n' +
    'zcwxZcAetq1hPgLIF6jh+UbY+6+HwAiTjxOVlTZ6U6oLOmZlqIhN/EyOepl0Y5ZM\n' +
    'jYDvSBbFC2mK3dcKqbMWdxR5Ptw/o6/0wQPDtcPSqgAGJc47cBrATex5xsH01eDU\n' +
    '4OCYnpbGN3pHd0sWKfXVPPiTl70qejo9K9VssSt3eXVKBofr5VMcMK50/OhLF+En\n' +
    'ao3qUaQtlNFMIW5IuxRNYNijrS4d+xXqqsOSQ4yhXZFGHv5OrCZZJk17xJgBjPBS\n' +
    'jtj77R4smA==\n' +
    '-----END CERTIFICATE-----';

export class EmeraldApi {
    private readonly hostname: string;
    private readonly credentials: CredentialsContext;

    static localApi(): EmeraldApi {
        return new EmeraldApi("127.0.0.1:8090", certLocal)
    }

    static devApi(): EmeraldApi {
        return new EmeraldApi("35.241.3.151:443", certDev)
    }

    constructor(hostname: string, cert: string) {
        this.hostname = hostname;
        this.credentials = emeraldCredentials(this.hostname, cert, [], "test");
    }

    blockchain(): BlockchainClient {
        return new BlockchainClient(this.hostname, this.credentials.getChannelCredentials());
    }

    monitoring(): MonitoringClient {
        return new MonitoringClient(this.hostname, this.credentials.getChannelCredentials());
    }

    market(): MarketClient {
        return new MarketClient(this.hostname, this.credentials.getChannelCredentials());
    }
}