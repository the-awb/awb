import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import dgram from 'node:dgram';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_SCLANG = '/Applications/SuperCollider.app/Contents/MacOS/sclang';

export class NativeScHostSupervisor {
  constructor( { token, bootstrapPath, sclangPath = process.env.AWB_SCLANG_PATH ?? DEFAULT_SCLANG,
    sclangConfig = process.env.AWB_SCLANG_CONFIG ?? null,
    serverPort = process.env.AWB_HEADLESS_SERVER_PORT ? Number( process.env.AWB_HEADLESS_SERVER_PORT ) : null,
    onChange = () => {} } ) {
    this.token = token; this.bootstrapPath = path.resolve( bootstrapPath ); this.sclangPath = sclangPath;
    this.sclangConfig = sclangConfig; this.serverPort = serverPort; this.onChange = onChange; this.child = null; this.state = 'stopped';
    this.lastExitCode = null; this.lastError = null; this.logTail = [];
  }

  snapshot() {
    return Object.freeze( { state: this.state, owned: Boolean( this.child ), processID: this.child?.pid ?? null,
      serverPort: this.serverPort, lastExitCode: this.lastExitCode, lastError: this.lastError,
      logTail: Object.freeze( [ ...this.logTail ] ) } );
  }

  appendLog( source, chunk ) {
    `${ chunk }`.split( /\r?\n/ ).filter( Boolean ).forEach( ( line ) => this.logTail.push( `${ source }: ${ line }`.slice( 0, 1000 ) ) );
    if ( this.logTail.length > 40 ) this.logTail.splice( 0, this.logTail.length - 40 );
  }

  async start( { oscPort } ) {
    if ( this.child ) return this.snapshot();
    await access( this.sclangPath, constants.X_OK ); await access( this.bootstrapPath, constants.R_OK );
    if ( this.sclangConfig ) await access( this.sclangConfig, constants.R_OK );
    this.serverPort = this.serverPort ?? await availableUdpPort( 57110 );
    this.state = 'starting'; this.lastExitCode = null; this.lastError = null; this.logTail = []; this.onChange( this.snapshot() );
    const args = [ '-D', '-u', `${ oscPort }` ];
    if ( this.sclangConfig ) args.push( '-l', this.sclangConfig );
    args.push( this.bootstrapPath );
    const child = spawn( this.sclangPath, args, {
      cwd: path.dirname( this.bootstrapPath ), env: { ...process.env, AWB_HEADLESS_TOKEN: this.token,
        AWB_HEADLESS_SERVER_PORT: `${ this.serverPort }`, AWB_HOST_AUTOSTART: '0' },
      stdio: [ 'ignore', 'pipe', 'pipe' ]
    } );
    this.child = child;
    child.stdout.on( 'data', ( chunk ) => this.appendLog( 'sclang', chunk ) );
    child.stderr.on( 'data', ( chunk ) => this.appendLog( 'sclang-error', chunk ) );
    child.once( 'spawn', () => { this.state = 'running'; this.onChange( this.snapshot() ); } );
    child.once( 'error', ( error ) => { this.lastError = error.message; this.state = 'failed'; this.child = null; this.onChange( this.snapshot() ); } );
    child.once( 'exit', ( code, signal ) => {
      if ( this.child !== child ) return;
      this.lastExitCode = code; this.lastError = signal ? `terminated by ${ signal }` : this.lastError;
      this.state = this.state === 'stopping' && ( code === 0 || signal ) ? 'stopped' : code === 0 ? 'stopped' : 'failed';
      this.child = null; this.onChange( this.snapshot() );
    } );
    return this.snapshot();
  }

  async stop( requestGracefulShutdown ) {
    const child = this.child; if ( !child ) return this.snapshot();
    this.state = 'stopping'; this.onChange( this.snapshot() );
    try { await requestGracefulShutdown?.(); } catch ( error ) { this.lastError = error.message; }
    await new Promise( ( resolve ) => {
      if ( !this.child || child.exitCode !== null ) { resolve(); return; }
      const term = setTimeout( () => { try { child.kill( 'SIGTERM' ); } catch {} }, 2500 );
      const kill = setTimeout( () => { try { child.kill( 'SIGKILL' ); } catch {} }, 5000 );
      child.once( 'exit', () => { clearTimeout( term ); clearTimeout( kill ); resolve(); } );
    } );
    return this.snapshot();
  }
}

async function availableUdpPort( preferred ) {
  const bind = ( port ) => new Promise( ( resolve, reject ) => {
    const socket = dgram.createSocket( 'udp4' ); socket.once( 'error', reject );
    socket.bind( port, '127.0.0.1', () => {
      const selected = socket.address().port; socket.close( () => resolve( selected ) );
    } );
  } );
  try { return await bind( preferred ); } catch ( error ) {
    if ( error.code !== 'EADDRINUSE' ) throw error;
    return bind( 0 );
  }
}

export function openSuperColliderIDE( { platform = process.platform,
  application = process.env.AWB_SUPERCOLLIDER_APP ?? 'SuperCollider' } = {} ) {
  const command = platform === 'darwin' ? '/usr/bin/open' : platform === 'win32' ? application : 'scide';
  const args = platform === 'darwin' ? [ '-a', application ] : [];
  return new Promise( ( resolve, reject ) => {
    const child = spawn( command, args, { detached: true, stdio: 'ignore' } );
    child.once( 'error', reject ); child.once( 'spawn', () => { child.unref(); resolve( { status: 'launched' } ); } );
  } );
}
