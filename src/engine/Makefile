NPM        ?= npm
NODE        = ts-node
PERL       ?= perl
PYTHON     ?= python3
TTX        ?= ttx

BUILD_DIR  = ./build

FINAL_TARGET = $(BUILD_DIR)/$(FONT_NAME).ttf

SVGS = $(FONT_NAME).zip

GRUNTFILE  = ../../Gruntfile.js
LAYERIZE   = layerize.ts

CODEPOINTS          = ${BASE_DIR}$(BUILD_DIR)/codepoints.js
OT_SOURCE  	        = $(BUILD_DIR)/$(FONT_NAME).ttx
RAW_FONT            = $(BUILD_DIR)/raw-font/$(FONT_NAME).ttf
RAW_FONT_TEMPORARY	= $(BUILD_DIR)/raw-font/$(FONT_NAME).temporary.ttf

$(FINAL_TARGET) : $(RAW_FONT) $(OT_SOURCE)
	rm -f $(FINAL_TARGET)
	# remove illegal <space> from the PostScript name in the font
	$(TTX) -t name -o $(RAW_FONT).names $(RAW_FONT)
	$(PERL) -i -e 'my $$ps = 0;' \
	        -e 'while(<>) {' \
	        -e '  $$ps = 1 if m/nameID="6"/;' \
	        -e '  $$ps = 0 if m|</namerecord>|;' \
	        -e '  s/Twemoji Mozilla/TwemojiMozilla/ if $$ps;' \
	        -e '  print;' \
	        -e '}' $(RAW_FONT).names
	$(TTX) -m $(RAW_FONT) -o $(RAW_FONT_TEMPORARY) $(RAW_FONT).names
	$(PYTHON) fixDirection.py $(RAW_FONT_TEMPORARY)
	$(TTX) -m $(RAW_FONT_TEMPORARY) -o $(FINAL_TARGET) $(OT_SOURCE)

$(RAW_FONT) : $(CODEPOINTS) $(GRUNTFILE)
	$(NPM) run grunt

$(CODEPOINTS) $(OT_SOURCE) : $(LAYERIZE) $(SVGS)
	$(NODE) $(LAYERIZE) $(SVGS) $(BUILD_DIR) $(FONT_NAME) ${START_LEN}
