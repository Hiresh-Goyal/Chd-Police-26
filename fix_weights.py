import glob
for f in glob.glob('backend/detection/rules/*.py'):
    with open(f, 'r') as file:
        content = file.read()
    content = content.replace('"weight":', '"fraud_weight":')
    with open(f, 'w') as file:
        file.write(content)
