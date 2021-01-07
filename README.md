# knitout-image-processing

Dependencies:\
 [readline-sync](https://www.npmjs.com/package/readline-sync)\
 [chalk](https://www.npmjs.com/package/chalk)\
 [jimp](https://www.npmjs.com/package/jimp)\
 [rgbquant](https://www.npmjs.com/package/rgbquant)

# Usage

NOTE: ensure that all dependencies have been installed with npm (package manager included with [node](https://nodejs.org/en/download/)) before running the programming.\
Place the image file (.png or .jpg) that you would like to process in the 'in-colorwork-images' folder.\
From the command-line, cd to the parent directory ('knitout-image-processing') and type 'npm run knitify'.\
Respond to the prompts as they appear in the terminal.\
When the program has finished running, a knitout file will be written to the sub-directory 'knit-out-files'. A visual depiction of the knitting machine instructions will also be written to the parent directory (under the name 'knit_motif.png').

**To then add shaping to the file:**\
Place an image (.png or .jpg) in the 'in-shape-images' folder. (*note: the graphic should include a white background and a shape with a black outline and fill*.)\
From the command-line, type 'npm run shapeify' and respond to the prompts.\
The program will then output a knitout file to the sub-directory 'knit-out-files'.
