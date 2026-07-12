import { isPrivateOrLocalHost } from './src/utils/url.ts';
console.log(isPrivateOrLocalHost('-1062731519')); // 192.168.1.1
console.log(isPrivateOrLocalHost('192.168.1.1'));
console.log(isPrivateOrLocalHost('-1442971138')); // 169.254.169.254
console.log(isPrivateOrLocalHost('169.254.169.254'));
