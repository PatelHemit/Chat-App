// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'arrow-back',
  'camera': 'camera-alt',
  'camera.fill': 'camera-alt',
  'paperclip': 'attach-file',
  'magnifyingglass': 'search',
  'ellipsis': 'more-vert',
  'person.fill': 'person',
  'plus.message.fill': 'chat',
  'video': 'videocam',
  'video.fill': 'videocam',
  'phone': 'call',
  'phone.fill': 'call',
  'mic': 'mic',
  'mic.fill': 'mic',
  'plus': 'add',
  'qrcode': 'qr-code',
  'face.smiling': 'insert-emoticon',
  'arrow.left': 'arrow-back',
  'sparkles': 'auto-awesome',
  'arrow.right.circle': 'logout',
  'checkmark': 'check',
  'checkmark.double': 'done-all',
  'trash': 'delete',
  'pause': 'pause',
  'play': 'play-arrow',
  'stop': 'stop',
  'pause.fill': 'pause',
  'play.fill': 'play-arrow',
  'info.circle': 'info-outline',
  'arrow.turn.up.left': 'reply',
  'doc.on.doc': 'content-copy',
  'arrow.turn.up.right': 'forward',
  'pin': 'push-pin',
  'star': 'star-border',
  'star.fill': 'star',
  'checkmark.circle': 'check-circle-outline',
  'person.2.fill': 'groups',
  'person.badge.plus': 'person-add',
  'plus.circle': 'add-circle-outline',
  'person.2': 'people',
  'bell': 'notifications-none',
  'bell.fill': 'notifications',
  'bell.slash': 'notifications-off',
  'photo': 'photo-library',
  'lock.fill': 'lock',
  'lock.shield': 'security',
  'person.text.rectangle': 'phonelink-lock',
  'hand.thumbsdown': 'thumb-down-off-alt',
  'door.left.hand.open': 'logout',
  'doc.fill': 'article',
  'photo.fill': 'image',
  'ellipsis.vertical': 'more-vert',
  'play.circle.fill': 'play-circle-filled',
  'checkmark.square.fill': 'check-box',
  'square': 'check-box-outline-blank',
  'xmark.circle.fill': 'cancel',
  'square.and.arrow.up': 'share',
  'xmark': 'close',
  'chevron.up': 'expand-less',
  'chevron.down': 'expand-more',
  'message.fill': 'chat',
  'arrow.up.right': 'call-made',
  'arrow.down.left': 'call-received',
  'delete.backward.fill': 'backspace',
  'camera.rotate.fill': 'switch-camera',
  'phone.down.fill': 'call-end',
  'video.slash.fill': 'videocam-off',
  'mic.slash.fill': 'mic-off',
} as Partial<IconMapping>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
