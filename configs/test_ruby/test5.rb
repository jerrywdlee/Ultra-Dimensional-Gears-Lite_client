# coding: utf-8
# Encoding.default_external = 'UTF-8' #will be error
# must disable buffling
STDOUT.sync = true
while true do
	puts "Enter a value :"
	val = gets
	putc val
	puts val
end
