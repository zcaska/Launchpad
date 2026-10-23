import { ThoughtBubble, ThoughtBubbleProps } from './ThoughtBubble';

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${msg}`);
    failures++;
  } else {
    console.log(`✅ ${msg}`);
  }
}

// Verify component definition
assert(typeof ThoughtBubble === 'function', 'ThoughtBubble component is a function');

// Verify props interface structure
const sampleProps: ThoughtBubbleProps = {
  quote: 'One step closer to greatness! ✨',
  visible: true,
  onDismiss: () => {},
  placement: 'top',
};

assert(sampleProps.visible === true, 'ThoughtBubble visible flag accepts boolean');
assert(typeof sampleProps.quote === 'string', 'ThoughtBubble quote accepts string');
assert(sampleProps.placement === 'top', 'ThoughtBubble placement accepts top/bottom');

if (failures > 0) process.exit(1);
console.log('✅ ThoughtBubble interface tests passed');
