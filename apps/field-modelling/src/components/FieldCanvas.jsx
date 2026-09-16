import SharedFieldCanvas from '@awb/field-renderer/react';
import { renderingSuspended } from '../engine/renderGate.js';

export default function FieldCanvas( props ) {
  return <SharedFieldCanvas { ...props } isRenderingSuspended={ renderingSuspended } />;
}
