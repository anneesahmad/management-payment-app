sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, MessageToast, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("zmm.requisitionupload.controller.View1", {

        onInit: function () {
            //var oStartupModel = this.getOwnerComponent().getModel("startupConfig");
            // var sDraft = oStartupModel.getProperty("/draft");
            // var sPrNo = oStartupModel.getProperty("/prNo");
    
            // console.log(sDraft, sPrNo);

            
            // Initialize the JSON model for Excel data
            var oModel = new JSONModel([]);
            this.getView().setModel(oModel, "excelData");
        },

        handleUploadPress: function () {
            var oFileUploader = this.byId("fileUploader");

            // Check if XLSX is loaded
            if (typeof XLSX === 'undefined') {
                MessageToast.show("Excel library is still loading. Please wait and try again.");
                return;
            }

            // Get the file from FileUploader
            var oFile = oFileUploader.oFileUpload.files[0];

            if (!oFile) {
                MessageToast.show("Please select a file first");
                return;
            }

            // Check if it's an Excel file
            var sFileName = oFile.name;
            var sFileExtension = sFileName.split('.').pop().toLowerCase();

            if (sFileExtension !== 'xlsx' && sFileExtension !== 'xls') {
                MessageToast.show("Please upload only Excel files (.xlsx or .xls)");
                return;
            }

            // Call the import function
            this._import(oFile);
        },


        _import: function (file) {
            var that = this;
            var oFileUploader = this.byId("fileUploader");
            

            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    try {
                        var data = e.target.result;
                        var workbook = XLSX.read(data, { type: 'binary' });
                        var worksheet = workbook.Sheets[workbook.SheetNames[0]];

                        /* STRATEGY: Convert to a 2D array first (header: 1).
                           Then find the first row that actually contains "Material Code".
                        */
                        var arrayData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                        // Find the index of the row that contains our expected header
                        var headerRowIndex = arrayData.findIndex(row =>
                            row.includes("Material Code") || row.includes("Account Assignment category")
                        );

                        if (headerRowIndex === -1) {
                            MessageToast.show("Could not find header row in Excel");
                            return;
                        }

                        // Now read the sheet starting from that specific row
                        var excelData = XLSX.utils.sheet_to_json(worksheet, {
                            range: headerRowIndex,
                            raw: false,
                            defval: ""
                        });

                        // Map your data as before...
                        var aMappedData = excelData.map(function (row) {
                            return {
                                AccountAssignmentCategory: row["Account Assignment category"] || "",
                                MaterialCode: row["Material Code"] || "",
                                Quantity: row["Quantity"] || "",
                                ValuationPrice: row["Valuation Price"] || "",
                                StorageLocation: row["Storage location"] || "",
                                DeliveryDate: row["Delivery Date"] || "",
                                PurchaseOrganization: row["Purchase Organization"] || "",
                                WBSElement: row["WBS Element"] || "",
                                ItemDetails: row["Item Details (Custom Field)"] || "",
                                StartDate: row["Start Date (For Service Request)"] || "",
                                EndDate: row["End Date (For Service Request)"] || "",
                                ItemType: row["Item Type"] || "",
                                Plant: row["Plant"] || "",
                                Curr: row["Currency"] || "",
                                TaxCode: row["Taxcode"] || "",
                            };
                        });

                        // FIX: Filter out rows that are effectively empty
                        // This checks if the row has at least a Material Code or Account Category
                        var aFilteredData = aMappedData.filter(function (item) {
                            return item.MaterialCode !== "" || item.AccountAssignmentCategory !== "";
                        });

                        // Set the FILTERED data to the model
                        var oModel = that.getView().getModel("excelData");
                        oModel.setData(aFilteredData);
                        oModel.refresh(true);

                        MessageToast.show(aFilteredData.length + " records loaded successfully");
                        oFileUploader.clear();

                    } catch (error) {
                        console.error(error);
                    }
                };
                reader.readAsBinaryString(file);
            }
        },
        handleUploadComplete: function (oEvent) {
            var sResponse = oEvent.getParameter("response");
            if (sResponse) {
                var iHttpStatusCode = parseInt(/\d{3}/.exec(sResponse)[0]);
                var sMessage = iHttpStatusCode === 200 ?
                    sResponse + " (Upload Success)" :
                    sResponse + " (Upload Error)";
                MessageToast.show(sMessage);
            }
        },

        // onSelectionChange: function (oEvent) {
        //     var oTable = oEvent.getSource();
        //     var aSelectedItems = oTable.getSelectedItems();

        //     // Get the toolbar instance
        //     var oToolbar = this.getView().byId("_IDGenOverflowToolbar");

        //     // Toggle visibility based on selection length
        //     if (aSelectedItems.length > 0) {
        //         oToolbar.setVisible(true);
        //         MessageToast.show(aSelectedItems.length + " items selected");
        //     } else {
        //         oToolbar.setVisible(false);
        //     }
        // },

onSelectionChange: function (oEvent) {
    var oTable = oEvent.getSource(); // More dynamic than this.byId("table")
    var aSelectedItems = oTable.getSelectedItems();
    var oFooter = this.getView().byId("_IDGenOverflowToolbar");
    
    var aValidSelections = [];
    var aPostedItems = [];

 
    aSelectedItems.forEach(function (oItem) {
        var oData = oItem.getBindingContext("excelData").getObject();
        
        if (oData.Posted) {
            aPostedItems.push(oItem);
        } else {
            aValidSelections.push(oItem);
        }
    });

     
    if (aPostedItems.length > 0) {
        aPostedItems.forEach(function (oItem) {
            oTable.setSelectedItem(oItem, false);
        });
        
        sap.m.MessageToast.show(aPostedItems.length + " already posted item(s) cannot be selected");
    }
 
    if (aValidSelections.length > 0) {
        oFooter.setVisible(true);
    } else {
        oFooter.setVisible(false);
    }
},

     

_convertToODataDate: function (dateString) {
    if (!dateString || dateString === "" || dateString === null) {
        return null;
    }
    
    try {
        var day, month, year;
        
        // Handle DD.MM.YYYY format (e.g., "30.01.2026")
        if (dateString.includes('.')) {
            var dateParts = dateString.trim().split('.');
            day = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in JavaScript
            year = parseInt(dateParts[2], 10);
        } 
        // Handle MM/DD/YYYY format (e.g., "01/30/2026")
        else if (dateString.includes('/')) {
            var dateParts = dateString.trim().split('/');
            month = parseInt(dateParts[0], 10) - 1; // Month is 0-indexed
            day = parseInt(dateParts[1], 10);
            year = parseInt(dateParts[2], 10);
        } 
        // Handle YYYY-MM-DD format (e.g., "2026-01-30")
        else if (dateString.includes('-')) {
            var dateParts = dateString.trim().split('-');
            year = parseInt(dateParts[0], 10);
            month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
            day = parseInt(dateParts[2], 10);
        }
        else {
            console.error("Unsupported date format:", dateString);
            return null;
        }
        
        // Create date object at midnight UTC to avoid timezone issues
        var date = new Date(Date.UTC(year, month, day, 0, 0, 0));
        
        // Validate the date
        if (isNaN(date.getTime())) {
            console.error("Invalid date:", dateString);
            return null;
        }
        
        var timestamp = date.getTime();
        
        // Return in OData date format: /Date(timestamp)/
        return "/Date(" + timestamp + ")/";
    } catch (error) {
        console.error("Date conversion error for", dateString, ":", error);
        return null;
    }
},

// Updated onUploadPress method
onUploadPress: function () {
    
            // var sDraft = oStartupModel.getProperty("/draft");
            // var sPrNo = oStartupModel.getProperty("/prNo");
    var oTable = this.byId("table");
    var aSelectedItems = oTable.getSelectedItems();
    // var sDraft = oStartupModel.getProperty("/draft");
    // var sPrNo = oStartupModel.getProperty("/prNo");
    
            // console.log(sDraft, sPrNo);


    if (aSelectedItems.length === 0) {
        MessageToast.show("Please select at least one item to post.");
        return;
    }

    MessageBox.confirm("Do you want to post " + aSelectedItems.length + " selected items?", {
        onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
                this._postSelectedData(aSelectedItems);
            } else {
                MessageToast.show("Cancelled");
            }
        }.bind(this)
    });

    // var oRec = 
    // {
    //     "purReqId" : "8f6e7d62-b3b6-1fd0-bced-937289ed4422",
    //     "reqNr" : "1001000347",
    //     "to_item" : [
    //         {
    //           "purReqId" : "8f6e7d62-b3b6-1fd0-bced-937289ed4422",
    //           "itemId" : "8f6e7d62-b3b6-1fd0-bced-937289ed4422",
    //           "itemType" : "1",
    //           "itemNr" : "00000",
    //           "accCateg" : "Q",
    //           "matrial" : "2000003639",
    //           "qty" : "100.000",
    //           "price" : "900.000",
    //           "sLoc" : "1004",
    //           "dlvDate" : new Date(),
    //           "purOrg" : "SRJ",
    //           "wbs" : "000000000000000000000000",
    //           "itemDetails" : "Filter",
    //           "startDate" : null,
    //           "endDate" : null
    //         }
    //     ]
    // }  ;

    // var oModel = this.getOwnerComponent().getModel();
    // oModel.create("/head", oRec, {
    //     success: function (oData, response){
    //         debugger;
    //     },
    //     error: function(oErr){
    //         debugger;
    //     }
    // });
},

onNavBack: function(oEvent){
    debugger;
    oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
    //oCrossAppNavigator.toE
// PurchaseRequisition-maintain&/C_PurchaseReqnHeader(PurchaseRequisition='1001000369',DraftUUID=guid'8f6e7d62-b3b6-1fe0-bbf1-d539b10feee6',IsActiveEntity=false)
// /?sap-iapp-state--history=TASG6812SDUEBRUJ8TZQIRGQP46WVXRQE494G1EZ0&sap-iapp-state-C_PurchaseReqnHeader=TASGBI061HMUUWU74P5023Q965459126L6DF98GFK
    
},

// New method to post selected data
_postSelectedData: function (aSelectedItems) {
    var oStartupModel = this.getOwnerComponent().getModel("startupConfig");    
    var that = this;
    
    // Show busy indicator
    sap.ui.core.BusyIndicator.show(0);
    
    var sPurReqId = oStartupModel.getProperty("/draft");
    var sReqNr = oStartupModel.getProperty("/prNo");
    
    // Build the to_item array from selected items
    var aItems = [];
    var aIndexMapping = []; // Separate array to track original indices
    
    aSelectedItems.forEach(function (oSelectedItem) {
        var oContext = oSelectedItem.getBindingContext("excelData");
        var oData = oContext.getObject();
        
        // Skip if already posted
        if (oData.Posted) {
            return;
        }
        
        var dlvDate = oData.DeliveryDate.slice(6,10) + "-" + oData.DeliveryDate.slice(3,5) + "-" + oData.DeliveryDate.slice(0,2);
        
        var oItem;
        
        // Separate payload for ItemType "1"
        if (oData.ItemType === "1") {
            oItem = {
                "purReqId": sPurReqId,
                "itemId": sPurReqId,
                "itemType": oData.ItemType || "",
                "itemNr": "00000",
                "accCateg": oData.AccountAssignmentCategory || "",
                "matrial": oData.MaterialCode || "",
                "qty": oData.Quantity ? parseFloat(oData.Quantity).toFixed(3) : "0.000",
                "price": oData.ValuationPrice ? parseFloat(oData.ValuationPrice).toFixed(3) : "0.000",
                "sLoc": oData.StorageLocation || "",
                "dlvDate": new Date(dlvDate),
                "purOrg": oData.PurchaseOrganization || "",
                "wbs": oData.WBSElement || "000000000000000000000000",
                "itemDetails": oData.ItemDetails || "",
                "plant": oData.Plant || "",
                "curr": oData.Curr || "",
                "taxCode": oData.TaxCode || ""
            };
        } 
        // Separate payload for ItemType "2"
        else if (oData.ItemType === "2") {
            var _startDate = oData.StartDate.slice(6,10) + "-" + oData.StartDate.slice(3,5) + "-" + oData.StartDate.slice(0,2);
            var _endDate = oData.EndDate.slice(6,10) + "-" + oData.EndDate.slice(3,5) + "-" + oData.EndDate.slice(0,2);
            
            oItem = {
                "purReqId": sPurReqId,
                "itemId": sPurReqId,
                "itemType": oData.ItemType || "",
                "itemNr": "00000",
                "accCateg": oData.AccountAssignmentCategory || "",
                "matrial": oData.MaterialCode || "",
                "qty": oData.Quantity ? parseFloat(oData.Quantity).toFixed(3) : "0.000",
                "price": oData.ValuationPrice ? parseFloat(oData.ValuationPrice).toFixed(3) : "0.000",
                "sLoc": oData.StorageLocation || "",
                "dlvDate": new Date(dlvDate),
                "purOrg": oData.PurchaseOrganization || "",
                "wbs": oData.WBSElement || "000000000000000000000000",
                "itemDetails": oData.ItemDetails || "",
                "startDate": new Date(_startDate),
                "endDate": new Date(_endDate),
                "plant": oData.Plant || "",
                "curr": oData.Curr || "",
                "taxCode": oData.TaxCode || ""
            };
        }
        
        // Store the mapping separately (not in the item that goes to backend)
        if (oItem) {
            var originalIndex = parseInt(oContext.getPath().split("/")[1]); // Get index from binding path
            aIndexMapping.push(originalIndex);
            aItems.push(oItem);
        }
    });
    
    // Check if there are any items to post
    if (aItems.length === 0) {
        sap.ui.core.BusyIndicator.hide();
        MessageBox.warning("All selected items have already been posted!");
        return;
    }
    
    // Build the complete payload
    var oPayload = {
        "purReqId": sPurReqId,
        "reqNr": sReqNr,
        "to_item": aItems
    };
    
    // Get the OData model
    var oModel = this.getOwnerComponent().getModel();
    
    // Set headers for the request
    oModel.setHeaders({
        "Content-Type": "application/json"
    });
    
    // POST the data
    oModel.create("/head", oPayload, {
        success: function (oData, response) {
            sap.ui.core.BusyIndicator.hide();
            
            // Update the excelData model with ItemNr from response
            var oExcelModel = that.getView().getModel("excelData");
            var aExcelData = oExcelModel.getData();
            
            // Update each item with the returned ItemNr and mark as posted
            if (oData.to_item && oData.to_item.results) {
                oData.to_item.results.forEach(function(oResponseItem, index) {
                    var originalIndex = aIndexMapping[index];
                    if (aExcelData[originalIndex]) {
                        // Add the ItemNr from response to the excelData
                        aExcelData[originalIndex].ItemNr = oResponseItem.itemNr;
                        // Mark as posted
                        aExcelData[originalIndex].Posted = true;
                    }
                });
            }
            
            // Refresh the model
            oExcelModel.setData(aExcelData);
            oExcelModel.refresh();
            
            MessageBox.success(aItems.length + " items posted successfully!", {
                onClose: function () {
                    // Clear the table selection
                    that.byId("table").removeSelections(true);
                    
                    // Hide the footer toolbar
                    that.byId("_IDGenOverflowToolbar").setVisible(false);
                }
            });
            
            console.log("Success:", oData);
        },
        error: function (oError) {
            sap.ui.core.BusyIndicator.hide();
            
            // Mark items as posted even on error to prevent retry
            var oExcelModel = that.getView().getModel("excelData");
            var aExcelData = oExcelModel.getData();
            
            aIndexMapping.forEach(function(originalIndex) {
                if (aExcelData[originalIndex]) {
                    aExcelData[originalIndex].Posted = true;
                    aExcelData[originalIndex].PostingError = true; // Optional: Mark as error
                }
            });
            
            oExcelModel.setData(aExcelData);
            oExcelModel.refresh();
            
            var sErrorMessage = "Error posting data";
            
            try {
                var oErrorResponse = JSON.parse(oError.responseText);
                if (oErrorResponse.error && oErrorResponse.error.message) {
                    sErrorMessage = oErrorResponse.error.message.value || oErrorResponse.error.message;
                }
            } catch (e) {
                sErrorMessage = oError.message || "Unknown error occurred";
            }
            
            MessageBox.error("Failed to post data: " + sErrorMessage);
            console.error("Error:", oError);
        }
    });
}
    });
});