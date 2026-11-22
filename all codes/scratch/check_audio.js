import { execSync } from 'child_process';

const psScript = `
$devices = Get-CimInstance -ClassName Win32_SoundDevice
foreach ($d in $devices) {
    [PSCustomObject]@{
        Name = $d.Name
        Status = $d.Status
        PNPDeviceID = $d.PNPDeviceID
    }
}
`;

const res = execSync(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, '; ')}"`, { encoding: 'utf8' });
console.log(res);
