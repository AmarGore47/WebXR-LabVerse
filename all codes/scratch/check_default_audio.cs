using System;
using System.Runtime.InteropServices;
[ComImport]
[Guid(" A95664D2-9614-4F35-A746-DE8DB63617E6\)]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
 int NotImpl1();
 int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}
[ComImport]
[Guid(\D666063F-1587-4E43-81F1-B948E807363F\)]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
 int OpenPropertyStore(int stgmAccess, out IPropertyStore ppProperties);
 int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
}
[ComImport]
[Guid(\886d8eeb-8cf2-4446-8d02-cdba1dbdcf99\)]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStore {
 int GetCount(out int cProps);
 int GetAt(int iProp, out PropertyKey pkey);
 int GetValue(ref PropertyKey key, out PropVariant pv);
}
[StructLayout(LayoutKind.Sequential, Pack = 4)]
struct PropertyKey {
 public Guid fmtid;
 public int pid;
}
[StructLayout(LayoutKind.Explicit)]
struct PropVariant {
 [FieldOffset(0)] public short vt;
 [FieldOffset(8)] public IntPtr pwszVal;
}
[ComImport]
[Guid(\BCDE0395-E52F-467C-8E3D-C4579291692E\)]
class MMDeviceEnumeratorComObject { }

public class AudioHelper {
 public static string GetDefaultAudioEndpointName() {
 var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
 IMMDevice dev;
 enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
 IPropertyStore store;
 dev.OpenPropertyStore(0, out store);
 var key = new PropertyKey { fmtid = new Guid(\a45c254e-df1c-4efd-8020-67d146a850e0\), pid = 14 };
 PropVariant pv;
 store.GetValue(ref key, out pv);
 return Marshal.PtrToStringUni(pv.pwszVal);
 }
}
