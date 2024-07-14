function parse(buffer: string) {
    return JSON.parse(buffer);
}
  
function stringify(value: any) {
    return JSON.stringify(value);
}
  
process.on('message', function(message) {
    let result;
    if (message.method === 'stringify') {
        result = stringify(message.value)
    } else if (message.method === 'parse') {
        result = parse(message.value);
    }
    process.send({ callerId: message.callerId, returnValue: result });
});