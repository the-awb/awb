import { Buffer } from 'node:buffer';

const paddedLength = ( length ) => ( length + 3 ) & ~3;

function encodeString( value ) {
  const source = Buffer.from( `${ value }\0`, 'utf8' );
  const result = Buffer.alloc( paddedLength( source.length ) );
  source.copy( result );
  return result;
}

function readString( buffer, offset ) {
  const end = buffer.indexOf( 0, offset );
  if ( end < 0 ) throw new Error( 'unterminated OSC string' );
  return { value: buffer.toString( 'utf8', offset, end ), offset: paddedLength( end + 1 ) };
}

export function encodeOscMessage( address, args = [] ) {
  const tags = args.map( ( value ) => {
    if ( Number.isInteger( value ) ) return 'i';
    if ( typeof value === 'number' ) return 'f';
    return 's';
  } );
  const parts = [ encodeString( address ), encodeString( `,${ tags.join( '' ) }` ) ];
  args.forEach( ( value, index ) => {
    const tag = tags[ index ];
    if ( tag === 'i' ) {
      const part = Buffer.alloc( 4 );
      part.writeInt32BE( value );
      parts.push( part );
    } else if ( tag === 'f' ) {
      const part = Buffer.alloc( 4 );
      part.writeFloatBE( value );
      parts.push( part );
    } else {
      parts.push( encodeString( value ) );
    }
  } );
  return Buffer.concat( parts );
}

export function decodeOscMessage( buffer ) {
  const address = readString( buffer, 0 );
  const tagString = readString( buffer, address.offset );
  const args = [];
  let offset = tagString.offset;
  for ( const tag of tagString.value.slice( 1 ) ) {
    if ( tag === 'i' ) {
      args.push( buffer.readInt32BE( offset ) );
      offset += 4;
    } else if ( tag === 'f' ) {
      args.push( buffer.readFloatBE( offset ) );
      offset += 4;
    } else if ( tag === 's' ) {
      const decoded = readString( buffer, offset );
      args.push( decoded.value );
      offset = decoded.offset;
    } else {
      throw new Error( `unsupported OSC type tag: ${ tag }` );
    }
  }
  return { address: address.value, args };
}

export function decodeOscPacket( buffer ) {
  if ( buffer.subarray( 0, 8 ).toString( 'ascii' ) !== '#bundle\0' ) {
    return [ decodeOscMessage( buffer ) ];
  }
  const messages = [];
  let offset = 16;
  while ( offset < buffer.length ) {
    const size = buffer.readInt32BE( offset );
    offset += 4;
    const end = offset + size;
    if ( size < 1 || end > buffer.length ) throw new Error( 'invalid OSC bundle element length' );
    messages.push( ...decodeOscPacket( buffer.subarray( offset, end ) ) );
    offset = end;
  }
  return messages;
}
