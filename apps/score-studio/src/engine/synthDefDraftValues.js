function copyValue( value ) {
  if ( Array.isArray( value ) ) return value.map( copyValue );
  if ( value && typeof value === 'object' ) {
    return Object.fromEntries( Object.entries( value ).map( ( [ key, item ] ) => [ key, copyValue( item ) ] ) );
  }
  return value;
}

export function synthDefDraftValues( model, initialValues = null ) {
  return Object.fromEntries( ( model?.controls ?? [] ).map( ( control ) => [
    control.name,
    initialValues && Object.hasOwn( initialValues, control.name )
      ? copyValue( initialValues[ control.name ] )
      : copyValue( control.default )
  ] ) );
}
