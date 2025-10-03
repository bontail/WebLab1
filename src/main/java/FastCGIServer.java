import com.fastcgi.FCGIInterface;


import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

import com.fasterxml.jackson.databind.ObjectMapper;

class FastCGIServer {

    public static class Coords {
        public Long x;
        public Double y;
        public Long r;
    }

    static ObjectMapper mapper = new ObjectMapper();

    public static void main(String[] args) {
        FCGIInterface fcgiInterface = new FCGIInterface();

        while (fcgiInterface.FCGIaccept() >= 0) {
            long time = System.nanoTime();
            String method = FCGIInterface.request.params.getProperty("REQUEST_METHOD");
            if (!method.equals("POST")) {
                System.out.println(err("unsupported method"));
                continue;
            }


            StringBuilder request = new StringBuilder();
            try {
                while (true) {
                    var c = FCGIInterface.request.inStream.read();
                    if (c < 0){
                        break;
                    }
                    request.append((char) c);
                }
            } catch (IOException e){
                System.out.println(err(e.toString()));
            }

            String req = request.toString();
            if (Objects.equals(req, "")) {
                System.out.println(err("empty body"));
            }

            Coords coords;
            try {
                coords = mapper.readValue(req, Coords.class);
            } catch (IOException e) {
                System.out.println(err(e.toString() + req));
                continue;
            }

            String res = checkCoords(coords);
            if (res != null) {
                System.out.println(err(res));
            }

            var isHit = isHit(coords);
            System.out.println(resp(isHit, coords.x.toString(), coords.y.toString(), coords.r.toString(), time));
        }

    }

    private static boolean checkTriangle(Coords coords) {
        if (coords.y < 0 || coords.x > 0) {
            return false;
        }

        double ABx = 0;
        double ABy = coords.r;
        double ACx = (double) coords.r / 2;
        double ACy = 0;
        double APx = Math.abs(coords.x);
        double APy = Math.abs(coords.y);

        double dotAB = APx * ABx + APy * ABy;
        double dotAC = APx * ACx + APy * ACy;

        if (dotAB < 0 || dotAC < 0) return false;
        if (dotAB > ABx * ABx + ABy * ABy) return false;
        if (dotAC > ACx * ACx + ACy * ACy) return false;

        double crossBC = (-Math.abs(coords.x)) * (-Math.abs(coords.y)) - ((double) coords.r / 2 - coords.y) * (-coords.x);
        return crossBC >= 0;
    }

    private static boolean checkRectangle(Coords coords) {
        return coords.y <= 0 && coords.y >= -(coords.r / 2) && coords.x >= 0 && coords.x <= coords.r;
    }

    private static boolean checkCircle(Coords coords) {
        if (coords.x < 0 || coords.y < 0) {
            return false;
        }

        return (coords.x * coords.x + coords.y * coords.y) <= (coords.r) * (coords.r);
    }

    private static boolean isHit(Coords coords) {
        return checkTriangle(coords) || checkRectangle(coords) || checkCircle(coords);
    }

    private static String checkCoords(Coords coords) {
        if (coords.x < -4 || coords.x > 4) {
            return "X must be in [-4;4]";
        }

        if (coords.y < -3 || coords.y > 5) {
            return "Y must be in [-3;5]";
        }

        if (coords.r < 1 || coords.r > 5) {
            return "R must be in [1;5]";
        }

        return null;
    }

    private static String resp(boolean isHit, String x, String y, String r, long wt) {
        String content = """
                {"result":"%s","x":"%s","y":"%s","r":"%s","workTime":"%s","time":"%s"}
                """.formatted(isHit, x, y, r, (double) (System.nanoTime() - wt) / 10000000, LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));
        return """
                HTTP/1.1 200 OK
                Content-Type: application/json; charset=utf-8
                Content-Length: %d
                
                
                %s
                """.formatted(content.getBytes(StandardCharsets.UTF_8).length, content);
    }

    private static String err(String msg) {
        String content = """
                {"error":"%s"}
                """.formatted(msg);

        return """
                HTTP/1.1 400 Bad Request
                Content-Type: application/json charset=utf-8
                Content-Length: %d
                
                
                %s
                """.formatted(content.getBytes(StandardCharsets.UTF_8).length, content);
    }
}