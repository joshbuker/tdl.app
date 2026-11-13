import { describe, expect, test } from 'vitest';
import { compareProtocol, parseProtocolVersion, PROTOCOL_HEADER, PROTOCOL_VERSION } from '../src/version.ts';

describe('protocol versions', () => {
  test('the current version and header', () => {
    expect(PROTOCOL_VERSION).toBe('1.0');
    expect(PROTOCOL_HEADER).toBe('tdl-protocol');
  });

  test('parseProtocolVersion reads major.minor and refuses anything else', () => {
    expect(parseProtocolVersion('1.3')).toEqual({ major: 1, minor: 3 });
    expect(parseProtocolVersion('1')).toBeNull();
    expect(parseProtocolVersion('1.0.0')).toBeNull();
    expect(parseProtocolVersion('v1.0')).toBeNull();
  });

  test('the same major version is ok, whichever minor is newer', () => {
    expect(compareProtocol('1.0', '1.3')).toBe('ok');
    expect(compareProtocol('1.4', '1.0')).toBe('ok');
  });

  test('a server on a newer major version means the app is outdated', () => {
    expect(compareProtocol('1.0', '2.0')).toBe('app-outdated');
  });

  test('a server one major version behind is ok; two or more behind is outdated', () => {
    expect(compareProtocol('2.0', '1.9')).toBe('ok');
    expect(compareProtocol('3.0', '1.0')).toBe('server-outdated');
  });
});
