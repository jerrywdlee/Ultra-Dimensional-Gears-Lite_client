//for inner JSON
//JSON.parse(raw_data.replace(/[\']/g,"\""))

function dg_json_parser(json_text) {
  var json_obj;
  console.log(json_text);
  try {
    json_obj = JSON.parse(json_text)
    return json_obj
  } catch (e) {
    try {
      json_obj = JSON.parse(json_text.replace(/[\']/g,"\""))
      return json_obj
    } catch (e) {
      json_obj = e;
      return json_obj
    }
  }
}

module.exports = dg_json_parser;
