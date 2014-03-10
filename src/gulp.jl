using ZMQ
const ctx = Context()
const sock = Socket(ctx, REP)
ZMQ.bind(sock, "tcp://127.0.0.1:*")
endpt = split(ZMQ.get_last_endpoint(sock), "\0")[1]
println("ZMQ bound to endpoint: $(endpt)")

while true
   print_with_color(:cyan,"Waiting for changes...\n")
   msg = ZMQ.recv(sock)
   reload(bytestring(msg))
   ZMQ.send(sock, "SUCCESS")
end
