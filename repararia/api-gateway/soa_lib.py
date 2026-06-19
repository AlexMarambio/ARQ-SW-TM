import socket
import select

def connect_to_bus(host='localhost', port=5000):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    print(f"Conectando a {host} en puerto {port}...")
    sock.connect((host, port)) 
    return sock

def send_message(sock, service_name, payload):
    # concatenar el nombre del servicio y el payload 
    content = service_name.encode() + payload.encode()
    length = str(len(content)).zfill(5)
    message = length.encode() + content
    sock.sendall(message)

def receive_message(sock):
    raw_len = sock.recv(5)
    if not raw_len: 
        return None
    try:
        amount_expected = int(raw_len)
    except ValueError:
        return None
        
    data = b''
    while len(data) < amount_expected:
        chunk = sock.recv(amount_expected - len(data))
        if not chunk: break
        data += chunk
    return data

def flush_socket(sock):
    # Drena todo lo que haya quedado pendiente en el socket
    while True:
        try:
            # select.select verifica si hay datos esperando en el socket
            ready = select.select([sock], [], [], 0.01)
            if ready[0]:
                sock.recv(4096)
            else:
                break
        except:
            break
