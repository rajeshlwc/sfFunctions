/**
 * Describe Filegenerator here.
 *
 * The exported method is the entry point for your code when the function is invoked. 
 *
 * Following parameters are pre-configured and provided to your function on execution: 
 * @param event: represents the data associated with the occurrence of an event, and  
 *                 supporting metadata about the source of that occurrence.
 * @param context: represents the connection to Functions and your Salesforce org.
 * @param logger: logging handler used to capture application logs and trace specifically
 *                 to a given execution of a function.
 */
 import ObjectsToCsv from 'objects-to-csv';
 
export default async function (event, context, logger) {
    //logger.info(`Invoking Filegenerator with payload ${JSON.stringify(event.data || {})}`);

    const results = await context.org.dataApi.query('SELECT CaseNumber,AccountId,Origin,Subject,Description,Comments,Status FROM Case');

    //logger.info(JSON.stringify(results.records));
    let dataArray = [];
    results.records.forEach(rec => {
        dataArray.push(rec.fields);
    });
    //logger.info(JSON.stringify(dataArray));

    let csvOutput = await printCsv(dataArray);
   // logger.info(csvOutput);
   // logger.info(Buffer.from(csvOutput).toString("base64"));
    const uow = context.org.dataApi.newUnitOfWork();
    const fileId = uow.registerCreate({
        type: "ContentVersion",
        fields: {
          Title: "CsvFileCases",
          PathOnClient: 'CsvFileCases.csv',
          VersionData: Buffer.from(csvOutput).toString("base64"),
          Origin: 'H',
          FirstPublishLocationId: '0015j00000Ch2awAAB'
        },
      });
      try {
        // Commit the Unit of Work with all the previous registered operations
        const response = await context.org.dataApi.commitUnitOfWork(uow);
        // Construct the result by getting the Id from the successful inserts
        const result = {
          fileId: response.get(fileId).id,
        };
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        logger.info(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
        return result;
      } catch (err) {
        const errorMessage = `Failed to insert record. Root Cause : ${err.message}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
}

async function printCsv(data) {
      let csvOut = await new ObjectsToCsv(data).toString();
      return csvOut;
  }
