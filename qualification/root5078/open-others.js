(()=>{const e=[...document.querySelectorAll('button.yolo-settings-tab-button')].find(e=>e.textContent==='Others');if(!e)throw Error('Others tab absent');e.click();return {clicked:e.textContent}})()
