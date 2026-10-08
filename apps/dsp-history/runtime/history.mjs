// Reported SC DSP timing, not total process CPU or an audio-dropout detector.
export class DSPHistory {
  constructor({capacity=1200}={}) {this.capacity=capacity;this.clear();}
  clear() {this.rows=[];this.next=1;this.epoch=(this.epoch??0)+1;this.maximum=null;this.last=null;this.status='waiting';}
  push(time,args) {
    if(!Number.isFinite(time)||args.length!==9||!args.every(Number.isFinite)||args[5]<0||args[6]<0||args[7]<=0)return false;
    const row={id:this.next++,time,average:args[5],peak:args[6],ugens:args[1],synths:args[2],sampleRate:args[7]};
    this.rows.push(row);if(this.rows.length>this.capacity)this.rows.shift();this.last=row;this.status='running';
    if(!this.maximum||row.peak>this.maximum.peak)this.maximum={peak:row.peak,time};return true;
  }
  gap(time) {if(this.status==='unavailable')return;this.status='unavailable';this.rows.push({id:this.next++,time,average:null,peak:null});if(this.rows.length>this.capacity)this.rows.shift();}
  snapshot({after=0,epoch=0}={}) {
    const reset=epoch!==this.epoch||after<(this.rows[0]?.id??1)-1||after>=this.next;
    return {epoch:this.epoch,cursor:this.next-1,reset,status:this.status,latest:this.last,maximum:this.maximum,rows:this.rows.filter(r=>reset||r.id>after)};
  }
}
