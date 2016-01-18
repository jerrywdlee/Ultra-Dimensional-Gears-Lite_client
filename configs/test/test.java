import java.util.*;

class test {
       public static void main(String argv[]){
            for ( int i = 0; i < argv.length; i++ ){
                System.out.println("argv[" + i + "] = " + argv[i] );
            }
            while(true){
           		System.out.println("input sth.");
           		Scanner input = new Scanner(System.in);
           		String s = input.next();
           		if (s.equals("break")){
           			break;
           		}
           		System.out.println("s = "+s);         		
           }   
       }
    }