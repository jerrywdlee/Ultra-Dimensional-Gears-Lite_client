# coding: utf-8
# Encoding.default_external = 'UTF-8' #will be error
# must disable buffling
STDOUT.sync = true
p ARGV[0]
while true do
	#puts "Enter a value :"
	val = STDIN.gets.chomp # For use "ARGV" as "mac_addr"
  puts '{\"ruby\" : \"'+val+'\"}'
	#putc val
	#puts val
end
