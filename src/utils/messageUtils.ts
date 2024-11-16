export function cleanMessage(message: string): string {
  return message.replace(/【\d+:\d+†[^】]+】/g, '').trim();
}

export function escapeMarkdown(text: string): string {
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  
  let escapedText = text.replace(/([_*[\]()~`>#\+\-=|{}.!])/g, '\\$1');
  escapedText = escapedText.replace(/\\\*\\\*/g, '*');
  escapedText = escapedText.replace(/\\\*/g, '*');
  
  return escapedText;
}