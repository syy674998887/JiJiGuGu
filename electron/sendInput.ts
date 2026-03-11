/**
 * Simulate keyboard input via Windows SendInput + KEYEVENTF_UNICODE.
 *
 * This bypasses LoL's separate clipboard by "typing" characters directly
 * into the focused window, just like lol_clipboard does.
 *
 * Uses koffi (pure-JS FFI) — no native compilation needed.
 */
import koffi from 'koffi'

// --- Win32 constants ---
const INPUT_KEYBOARD = 1
const KEYEVENTF_UNICODE = 0x0004
const KEYEVENTF_KEYUP = 0x0002

const user32 = koffi.load('user32.dll')

const SendInput = user32.func('__stdcall', 'SendInput', 'uint', [
    'uint',     // nInputs
    'void *',   // pInputs (raw buffer)
    'int',      // cbSize
])

// sizeof(INPUT) on x64 = 40 bytes
const INPUT_SIZE = 40

/**
 * Build a single INPUT struct (KEYEVENTF_UNICODE) in a Buffer.
 */
function writeUnicodeInput(buf: Buffer, offset: number, scanCode: number, keyUp: boolean) {
    buf.writeUInt32LE(INPUT_KEYBOARD, offset + 0)
    buf.writeUInt16LE(0, offset + 8)                     // wVk = 0
    buf.writeUInt16LE(scanCode, offset + 10)             // wScan = UTF-16 char
    const flags = KEYEVENTF_UNICODE | (keyUp ? KEYEVENTF_KEYUP : 0)
    buf.writeUInt32LE(flags, offset + 12)
    buf.writeUInt32LE(0, offset + 16)
}

/**
 * Type a string into the currently focused window using SendInput.
 * Builds all INPUT structs in one buffer and sends in a single call.
 */
const GetAsyncKeyState = user32.func('__stdcall', 'GetAsyncKeyState', 'short', ['int'])

const VK_TAB = 0x09

/**
 * Check if a key is currently held down.
 */
export function isKeyDown(vk: number): boolean {
    return ((GetAsyncKeyState(vk) as number) & 0x8000) !== 0
}

/**
 * Check if Tab key is currently held down.
 */
export function isTabDown(): boolean {
    return isKeyDown(VK_TAB)
}

export function sendInputText(text: string): number {
    if (!text) return 0

    const utf16 = Buffer.from(text, 'utf16le')
    const codeUnits = utf16.length / 2

    const inputCount = codeUnits * 2
    const buf = Buffer.alloc(inputCount * INPUT_SIZE)

    for (let i = 0; i < codeUnits; i++) {
        const code = utf16.readUInt16LE(i * 2)
        const baseOffset = i * 2 * INPUT_SIZE
        writeUnicodeInput(buf, baseOffset, code, false)
        writeUnicodeInput(buf, baseOffset + INPUT_SIZE, code, true)
    }

    return SendInput(inputCount, buf, INPUT_SIZE) as number
}
