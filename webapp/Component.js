sap.ui.define([
    "sap/ui/core/UIComponent",
    "zmm/requisitionupload/model/models"
], (UIComponent, models) => {
    "use strict";
    var draft ;
    var prNo;
    return UIComponent.extend("zmm.requisitionupload.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);
          var oStartupData = {
        draft: this.oComponentData.startupParameters.DraftUUID[0],
        prNo: this.oComponentData.startupParameters.PurchaseRequisition[0]
    };

 
    var oModel = new sap.ui.model.json.JSONModel(oStartupData);
    this.setModel(oModel, "startupConfig");

            // draft = this.oComponentData.startupParameters.DraftUUID[0];
            // prNo = this.oComponentData.startupParameters.PurchaseRequisition[0];
            debugger;
            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
            	var jQueryScript = document.createElement('script');
			jQueryScript.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.10.0/jszip.js');
			document.head.appendChild(jQueryScript);
		
		
			var jQueryScript = document.createElement('script');
			jQueryScript.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.10.0/xlsx.js');
			document.head.appendChild(jQueryScript);
        }
        
    });
});